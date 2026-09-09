import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

import httpx

from app.config import settings


def normalize_splunk_event(row: dict[str, Any]) -> dict[str, Any]:
    """Map Splunk search/HEC rows back to Synapse demo event shape."""
    if row.get("event_id") and row.get("message"):
        return row

    raw = row.get("_raw")
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                row = {**parsed, **row}
        except json.JSONDecodeError:
            row = {**row, "message": raw}

    if "event" in row and isinstance(row["event"], dict):
        row = {**row["event"], **{k: v for k, v in row.items() if k != "event"}}

    message = row.get("message") or row.get("_raw") or ""
    service = row.get("service") or row.get("Service") or ""
    event_type = row.get("event_type") or row.get("eventType") or row.get("sourcetype") or "event"

    event_id = row.get("event_id")
    if not event_id:
        digest = hashlib.sha1(f"{message}{service}{row.get('_time', '')}".encode()).hexdigest()[:12]
        event_id = f"evt-{digest}"

    timestamp = row.get("timestamp") or row.get("_time") or datetime.now(timezone.utc).isoformat()

    return {
        "event_id": event_id,
        "timestamp": timestamp,
        "sourcetype": row.get("sourcetype", "unknown"),
        "source": row.get("source", "splunk"),
        "host": row.get("host", "unknown"),
        "service": service,
        "event_type": event_type,
        "message": message if isinstance(message, str) else str(message),
    }


class MockSplunkProvider:
    """Local event store for demo and offline development."""

    def __init__(self) -> None:
        self._events: list[dict[str, Any]] = []
        self._loaded = False

    def _ensure_loaded(self) -> None:
        if self._loaded:
            return
        seed_path = Path(__file__).resolve().parents[3] / "data" / "demo_events.json"
        if seed_path.exists():
            payload = json.loads(seed_path.read_text(encoding="utf-8"))
            self._events = payload.get("events", [])
        self._loaded = True

    async def search(self, query: str, earliest: str = "-24h", latest: str = "now") -> list[dict[str, Any]]:
        self._ensure_loaded()
        raw = query.replace("search", "").replace("|", " ").replace("*", " ").strip()
        tokens = [t.strip().lower() for t in raw.split() if t.strip() and not t.startswith("index=")]
        if not tokens:
            return list(self._events)

        matched: list[dict[str, Any]] = []
        for event in self._events:
            haystack = " ".join(
                str(event.get(field, "")) for field in ("message", "service", "event_type", "sourcetype", "source")
            ).lower()
            if any(token in haystack for token in tokens):
                matched.append(event)
        return matched

    async def ingest_batch(self, events: list[dict[str, Any]]) -> int:
        self._ensure_loaded()
        self._events.extend(events)
        return len(events)

    async def test_connection(self) -> dict[str, Any]:
        self._ensure_loaded()
        return {"ok": True, "mode": "mock", "events_available": len(self._events)}

    def build_search_url(self, query: str, earliest: str = "-24h") -> str:
        encoded = quote(query)
        return f"{settings.splunk_web_url}/en-US/app/search/search?q={encoded}&earliest={earliest}&latest=now"


class SplunkRestProvider:
    """Production Splunk REST + HEC client."""

    def __init__(self) -> None:
        self._host = settings.splunk_host
        self._port = settings.splunk_port
        self._hec_port = settings.splunk_hec_port
        self._token = settings.splunk_token
        self._username = settings.splunk_username
        self._password = settings.splunk_password
        self._index = settings.splunk_index
        self._session_key: str | None = None
        self._client = httpx.AsyncClient(verify=False, timeout=45.0)

    async def _auth_header(self) -> dict[str, str]:
        if self._token and not self._username:
            return {"Authorization": f"Bearer {self._token}"}
        if self._session_key:
            return {"Authorization": f"Splunk {self._session_key}"}
        if self._token:
            return {"Authorization": f"Splunk {self._token}"}
        if self._username and self._password:
            response = await self._client.post(
                f"https://{self._host}:{self._port}/services/auth/login",
                data={"username": self._username, "password": self._password},
            )
            response.raise_for_status()
            payload = json.loads(response.text)
            self._session_key = payload["sessionKey"]
            return {"Authorization": f"Splunk {self._session_key}"}
        raise RuntimeError("Splunk credentials missing: set SPLUNK_TOKEN or SPLUNK_USERNAME/SPLUNK_PASSWORD")

    async def search(self, query: str, earliest: str = "-24h", latest: str = "now") -> list[dict[str, Any]]:
        headers = await self._auth_header()
        tokens = [t for t in query.replace("search", "").split() if t.strip() and t != "*"]
        term = " ".join(tokens) if tokens else "*"
        full_query = f"search index={self._index} {term} earliest={earliest} latest={latest}"
        response = await self._client.post(
            f"https://{self._host}:{self._port}/services/search/jobs/export",
            headers=headers,
            data={"search": full_query, "output_mode": "json"},
        )
        response.raise_for_status()
        results: list[dict[str, Any]] = []
        for line in response.text.splitlines():
            if not line.strip():
                continue
            try:
                row = json.loads(line)
                if "result" in row:
                    results.append(normalize_splunk_event(row["result"]))
            except json.JSONDecodeError:
                continue
        return results

    async def ingest_batch(self, events: list[dict[str, Any]]) -> int:
        if not self._token:
            raise RuntimeError("SPLUNK_TOKEN required for HEC ingest (port 8088)")
        url = f"https://{self._host}:{self._hec_port}/services/collector/event"
        headers = {"Authorization": f"Splunk {self._token}"}
        sent = 0
        for event in events:
            payload = {
                "index": self._index,
                "sourcetype": event.get("sourcetype", "synapse"),
                "source": event.get("source", "synapse-seed"),
                "host": event.get("host", "synapse"),
                "time": event.get("timestamp"),
                "event": event,
            }
            response = await self._client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            sent += 1
        return sent

    async def test_connection(self) -> dict[str, Any]:
        try:
            events = await self.search("*", earliest="-7d")
            return {
                "ok": True,
                "mode": "live",
                "host": self._host,
                "index": self._index,
                "events_found": len(events),
            }
        except Exception as exc:
            return {"ok": False, "mode": "live", "host": self._host, "error": str(exc)}

    def build_search_url(self, query: str, earliest: str = "-24h") -> str:
        encoded = quote(f"index={self._index} {query}")
        return f"{settings.splunk_web_url}/en-US/app/search/search?q={encoded}&earliest={earliest}&latest=now"

    async def aclose(self) -> None:
        await self._client.aclose()


def get_splunk_provider() -> MockSplunkProvider | SplunkRestProvider:
    if settings.use_mock_splunk or not settings.splunk_host:
        return MockSplunkProvider()
    return SplunkRestProvider()


def parse_timestamp(value: str | datetime) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    cleaned = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(cleaned)
    except ValueError:
        return datetime.now(timezone.utc)
