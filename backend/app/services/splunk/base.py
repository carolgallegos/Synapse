from datetime import datetime
from typing import Any, Protocol


class SplunkProvider(Protocol):
    async def search(self, query: str, earliest: str = "-24h", latest: str = "now") -> list[dict[str, Any]]:
        ...

    async def ingest_batch(self, events: list[dict[str, Any]]) -> int:
        ...

    def build_search_url(self, query: str, earliest: str = "-24h") -> str:
        ...
