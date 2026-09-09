export interface SplunkEvidence {
  event_id: string;
  timestamp: string;
  sourcetype: string;
  source: string;
  host: string;
  message: string;
  splunk_query: string;
}

export interface CausalLink {
  from_label: string;
  to_label: string;
  relation: string;
  evidence: SplunkEvidence[];
}

export interface HistoricalMatch {
  incident_id: string;
  date: string;
  similarity: number;
  summary: string;
  shared_nodes: string[];
}

export interface ImpactSummary {
  affected_services: string[];
  affected_systems: string[];
  estimated_users: number;
  ticket_volume_delta: string;
}

export interface GraphNode {
  id: string;
  label: string;
  kind: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
  weight?: number;
}

export interface AnalysisReport {
  query: string;
  root_cause: string;
  causal_chain: CausalLink[];
  related_events: SplunkEvidence[];
  historical_matches: HistoricalMatch[];
  impact: ImpactSummary;
  technical_summary: { title: string; body: string };
  executive_summary: { title: string; body: string };
  graph_nodes: GraphNode[];
  graph_edges: GraphEdge[];
  agent_trace?: AgentTrace | null;
}

export interface RiskPrediction {
  service: string;
  risk_score: number;
  recommendation: string;
  reasons: string[];
  evidence: SplunkEvidence[];
}

export interface AgentStep {
  tool: string;
  input: Record<string, unknown>;
  output_summary: string;
  duration_ms: number;
}

export interface AgentTrace {
  mode: string;
  steps: AgentStep[];
  generated_spl?: string | null;
}

const API = "/api/v1";

export async function analyzeQuestion(question: string): Promise<AnalysisReport> {
  const res = await fetch(`${API}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) throw new Error("Analysis failed");
  return res.json();
}

export async function fetchRisk(): Promise<RiskPrediction> {
  const res = await fetch(`${API}/predict/risk`);
  if (!res.ok) throw new Error("Risk fetch failed");
  return res.json();
}

export async function fetchSplunkUrl(query: string): Promise<string> {
  const res = await fetch(`${API}/splunk/url?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  return data.url;
}

export async function fetchHealth(): Promise<{ splunk_mode: string; mcp_mode: string; graph_nodes: number }> {
  const res = await fetch(`${API}/health`);
  return res.json();
}
