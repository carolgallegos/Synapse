from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.models.schemas import AnalysisReport, HealthResponse, IngestResult
from app.services.analysis.pipeline import IncidentAnalyzer, IngestPipeline
from app.services.graph.store import graph_store
from app.services.splunk.client import get_splunk_provider
from app.config import settings

router = APIRouter()


class QueryRequest(BaseModel):
    question: str = Field(min_length=3, examples=["Why are customer complaints increasing?"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    mode = "mock" if settings.use_mock_splunk or not settings.splunk_host else "live"
    return HealthResponse(
        status="ok",
        splunk_mode=mode,
        graph_nodes=graph_store.node_count,
        graph_edges=graph_store.edge_count,
    )


@router.post("/ingest", response_model=IngestResult)
async def ingest() -> IngestResult:
    return await IngestPipeline().run("*")


@router.post("/analyze", response_model=AnalysisReport)
async def analyze(body: QueryRequest) -> AnalysisReport:
    try:
        return await IncidentAnalyzer().analyze(body.question)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/predict/risk")
async def predict_risk() -> dict:
    return await IncidentAnalyzer().predict_risk()


@router.get("/graph")
async def get_graph() -> dict:
    await IngestPipeline().run("*")
    nodes, edges = graph_store.get_subgraph(
        [
            "deployment:deployment-v4-2",
            "service:authentication-service",
            "service:login-service",
            "service:customer-portal",
            "event:complaint",
        ],
        depth=3,
    )
    return {"nodes": [n.model_dump() for n in nodes], "edges": [e.model_dump() for e in edges]}


@router.get("/splunk/url")
async def splunk_search_url(q: str) -> dict:
    provider = get_splunk_provider()
    return {"url": provider.build_search_url(q)}
