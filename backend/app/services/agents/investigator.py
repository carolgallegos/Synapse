import time
from typing import Any

from app.models.schemas import AgentStep, AgentTrace
from app.services.splunk.mcp_client import MockSplunkMcpClient, SplunkMcpClient, get_mcp_client


class AgenticInvestigator:
    """
    Agentic ops workflow via Splunk MCP Server tools:
    generate_spl → run_splunk_query → summarize for RCA pipeline.
    """

    def __init__(self) -> None:
        self._mcp = get_mcp_client()

    async def investigate(self, question: str) -> tuple[AgentTrace, list[dict[str, Any]]]:
        steps: list[AgentStep] = []
        events: list[dict[str, Any]] = []
        generated_spl: str | None = None

        t0 = time.perf_counter()
        info = await self._mcp.get_splunk_info()
        steps.append(
            AgentStep(
                tool="get_splunk_info",
                input={},
                output_summary=str(info)[:200],
                duration_ms=int((time.perf_counter() - t0) * 1000),
            )
        )

        t0 = time.perf_counter()
        indexes = await self._mcp.get_indexes()
        steps.append(
            AgentStep(
                tool="get_indexes",
                input={},
                output_summary=f"indexes: {', '.join(indexes[:5])}",
                duration_ms=int((time.perf_counter() - t0) * 1000),
            )
        )

        t0 = time.perf_counter()
        generated_spl = await self._mcp.generate_spl(question)
        steps.append(
            AgentStep(
                tool="generate_spl",
                input={"query": question},
                output_summary=generated_spl,
                duration_ms=int((time.perf_counter() - t0) * 1000),
            )
        )

        t0 = time.perf_counter()
        events = await self._mcp.run_splunk_query(generated_spl)
        steps.append(
            AgentStep(
                tool="run_splunk_query",
                input={"query": generated_spl},
                output_summary=f"{len(events)} events returned",
                duration_ms=int((time.perf_counter() - t0) * 1000),
            )
        )

        mode = self._mcp.mode
        if isinstance(self._mcp, SplunkMcpClient) and len(events) == 0:
            fallback = MockSplunkMcpClient()
            generated_spl = await fallback.generate_spl(question)
            events = await fallback.run_splunk_query(generated_spl)
            steps.append(
                AgentStep(
                    tool="run_splunk_query",
                    input={"query": generated_spl, "fallback": "mock-mcp"},
                    output_summary=f"fallback: {len(events)} events",
                    duration_ms=0,
                )
            )
            mode = "live-mcp+fallback"

        trace = AgentTrace(mode=mode, steps=steps, generated_spl=generated_spl)
        return trace, events
