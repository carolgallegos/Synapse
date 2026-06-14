from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class NodeKind(str, Enum):
    SERVICE = "service"
    EVENT = "event"
    DEPLOYMENT = "deployment"
    METRIC = "metric"
    TICKET = "ticket"
    ALERT = "alert"


class GraphNode(BaseModel):
    id: str
    label: str
    kind: NodeKind
    metadata: dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    source: str
    target: str
    relation: str
    weight: float = 1.0


class SplunkEvidence(BaseModel):
    event_id: str
    timestamp: datetime
    sourcetype: str
    source: str
    host: str
    message: str
    splunk_query: str


class CausalLink(BaseModel):
    from_label: str
    to_label: str
    relation: str
    evidence: list[SplunkEvidence] = Field(default_factory=list)


class HistoricalMatch(BaseModel):
    incident_id: str
    date: str
    similarity: float
    summary: str
    shared_nodes: list[str]


class ImpactSummary(BaseModel):
    affected_services: list[str]
    affected_systems: list[str]
    estimated_users: int
    ticket_volume_delta: str


class ReportSection(BaseModel):
    title: str
    body: str


class AnalysisReport(BaseModel):
    query: str
    root_cause: str
    causal_chain: list[CausalLink]
    related_events: list[SplunkEvidence]
    historical_matches: list[HistoricalMatch]
    impact: ImpactSummary
    technical_summary: ReportSection
    executive_summary: ReportSection
    graph_nodes: list[GraphNode]
    graph_edges: list[GraphEdge]


class IngestResult(BaseModel):
    events_processed: int
    entities_extracted: int
    relationships_added: int


class HealthResponse(BaseModel):
    status: str
    splunk_mode: str
    graph_nodes: int
    graph_edges: int
