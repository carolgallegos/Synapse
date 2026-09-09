import json
from typing import Any

import httpx

from app.config import settings
from app.services.splunk.client import get_splunk_provider, normalize_splunk_event


class MockSplunkMcpClient:
    """Simulates Splunk MCP Server tools offline (same tool names as production MCP)."""

    mode = "mock-mcp"

    async def list_tools(self) -> list[str]:
        return [
            "generate_spl",
            "run_splunk_query",
            "get_indexes",
            "get_splunk_info",
            "get_saved_searches",
        ]

    async def generate_spl(self, natural_language: str) -> str:
        tokens = [
            t
            for t in natural_language.lower().replace("?", "").split()
            if t not in {"why", "are", "is", "the", "a", "an", "what", "how", "which", "in", "to", "for"}
        ]
        focus = " ".join(tokens[:8]) or "authentication deployment latency login ticket complaint"
        return f"search index={settings.splunk_index} {focus} earliest=-24h latest=now"

    async def run_splunk_query(self, spl: str) -> list[dict[str, Any]]:
        provider = get_splunk_provider()
        raw = spl.replace("search", "").replace(f"index={settings.splunk_index}", "")
        return await provider.search(raw.strip() or "*")

    async def get_indexes(self) -> list[str]:
        return [settings.splunk_index or "main"]

    async def get_splunk_info(self) -> dict[str, str]:
        return {"version": "demo", "serverName": "synapse-mock", "product": "Splunk MCP (offline)"}

    async def test_connection(self) -> dict[str, Any]:
        tools = await self.list_tools()
        return {"ok": True, "mode": self.mode, "tools": tools}


class SplunkMcpClient:
    """JSON-RPC client for Splunk MCP Server at /services/mcp (Splunkbase app 7931)."""

    mode = "live-mcp"

    def __init__(self) -> None:
        self._host = settings.splunk_host
        self._port = settings.splunk_port
        self._token = settings.splunk_token
        self._username = settings.splunk_username
        self._password = settings.splunk_password
        self._session_key: str | None = None
        self._client = httpx.AsyncClient(verify=False, timeout=60.0)
        self._rpc_id = 0

    async def _auth_header(self) -> dict[str, str]:
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
            self._session_key = json.loads(response.text)["sessionKey"]
            return {"Authorization": f"Splunk {self._session_key}"}
        raise RuntimeError("Splunk MCP credentials missing")

    async def _call_tool(self, name: str, arguments: dict[str, Any]) -> Any:
        self._rpc_id += 1
        headers = await self._auth_header()
        payload = {
            "jsonrpc": "2.0",
            "id": self._rpc_id,
            "method": "tools/call",
            "params": {"name": name, "arguments": arguments},
        }
        response = await self._client.post(
            f"https://{self._host}:{self._port}/services/mcp",
            headers={**headers, "Content-Type": "application/json"},
            json=payload,
        )
        response.raise_for_status()
        body = response.json()
        if "error" in body:
            raise RuntimeError(body["error"].get("message", "MCP tool call failed"))
        result = body.get("result", {})
        content = result.get("content", [])
        if content and isinstance(content[0], dict) and "text" in content[0]:
            text = content[0]["text"]
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return text
        return result

    async def list_tools(self) -> list[str]:
        self._rpc_id += 1
        headers = await self._auth_header()
        payload = {"jsonrpc": "2.0", "id": self._rpc_id, "method": "tools/list", "params": {}}
        response = await self._client.post(
            f"https://{self._host}:{self._port}/services/mcp",
            headers={**headers, "Content-Type": "application/json"},
            json=payload,
        )
        response.raise_for_status()
        tools = response.json().get("result", {}).get("tools", [])
        return [t.get("name", "") for t in tools if t.get("name")]

    async def generate_spl(self, natural_language: str) -> str:
        result = await self._call_tool("generate_spl", {"query": natural_language})
        if isinstance(result, dict) and "spl" in result:
            return str(result["spl"])
        if isinstance(result, str):
            return result
        return str(result)

    async def run_splunk_query(self, spl: str) -> list[dict[str, Any]]:
        result = await self._call_tool("run_splunk_query", {"query": spl})
        rows: list[dict[str, Any]] = []
        if isinstance(result, list):
            for row in result:
                if isinstance(row, dict):
                    rows.append(normalize_splunk_event(row))
        elif isinstance(result, dict) and "results" in result:
            for row in result["results"]:
                rows.append(normalize_splunk_event(row))
        return rows

    async def get_indexes(self) -> list[str]:
        result = await self._call_tool("get_indexes", {})
        if isinstance(result, list):
            return [str(x) for x in result]
        if isinstance(result, dict) and "indexes" in result:
            return [str(x) for x in result["indexes"]]
        return [settings.splunk_index]

    async def get_splunk_info(self) -> dict[str, str]:
        result = await self._call_tool("get_splunk_info", {})
        return result if isinstance(result, dict) else {"info": str(result)}

    async def test_connection(self) -> dict[str, Any]:
        try:
            tools = await self.list_tools()
            return {"ok": True, "mode": self.mode, "tools": tools, "host": self._host}
        except Exception as exc:
            return {"ok": False, "mode": self.mode, "host": self._host, "error": str(exc)}


def get_mcp_client() -> MockSplunkMcpClient | SplunkMcpClient:
    if settings.use_mock_splunk or not settings.splunk_host or not settings.use_splunk_mcp:
        return MockSplunkMcpClient()
    return SplunkMcpClient()
