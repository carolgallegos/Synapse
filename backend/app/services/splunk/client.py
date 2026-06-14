import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

from app.config import settings


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

    def build_search_url(self, query: str, earliest: str = "-24h") -> str:
        encoded = quote(query)
        return f"{settings.splunk_web_url}/en-US/app/search/search?q={encoded}&earliest={earliest}&latest=now"


class SplunkRestProvider:
    """Production Splunk REST client."""

    def __init__(self) -> None:
        import httpx

        self._host = settings.splunk_host
        self._port = settings.splunk_port
        self._token = settings.splunk_token
        self._index = settings.splunk_index
        self._client = httpx.AsyncClient(
            base_url=f"https://{self._host}:{self._port}",
            headers={"Authorization": f"Bearer {self._token}"},
            verify=False,
            timeout=30.0,
        )

    async def search(self, query: str, earliest: str = "-24h", latest: str = "now") -> list[dict[str, Any]]:
        import httpx

        full_query = f"search index={self._index} {query} earliest={earliest} latest={latest}"
        response = await self._client.post(
            "/services/search/jobs/export",
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
                    results.append(row["result"])
            except json.JSONDecodeError:
                continue
        return results

    async def ingest_batch(self, events: list[dict[str, Any]]) -> int:
        import httpx

        payload = "\n".join(json.dumps(event) for event in events)
        response = await self._client.post(
            f"/services/collector/event?index={self._index}",
            content=payload,
            headers={"Content-Type": "application/json"},
        )
        response.raise_for_status()
        return len(events)

    def build_search_url(self, query: str, earliest: str = "-24h") -> str:
        encoded = quote(f"index={self._index} {query}")
        return f"{settings.splunk_web_url}/en-US/app/search/search?q={encoded}&earliest={earliest}&latest=now"


def get_splunk_provider() -> MockSplunkProvider | SplunkRestProvider:
    if settings.use_mock_splunk or not settings.splunk_host:
        return MockSplunkProvider()
    return SplunkRestProvider()


def parse_timestamp(value: str | datetime) -> datetime:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    return datetime.fromisoformat(value.replace("Z", "+00:00"))
