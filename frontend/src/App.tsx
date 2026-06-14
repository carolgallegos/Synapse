import { useEffect, useMemo, useState } from "react";
import {
  analyzeQuestion,
  fetchHealth,
  fetchRisk,
  type AnalysisReport,
  type RiskPrediction,
} from "./api";
import { CausalGraph } from "./components/CausalGraph";
import { EvidencePanel } from "./components/EvidencePanel";
import { IncidentTimeline } from "./components/IncidentTimeline";
import { buildIncidentReport, downloadReport } from "./utils/exportReport";
import { eventMatchesNodeLoose } from "./utils/nodeEvidence";

type ReportTab = "executive" | "technical";

const DEFAULT_QUERY = "Why are customer complaints increasing?";

const DEMO_QUERIES = [
  "Why are customer complaints increasing?",
  "What caused the authentication degradation?",
  "Which services are affected by the deployment?",
];

export default function App() {
  const [question, setQuestion] = useState(DEFAULT_QUERY);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [risk, setRisk] = useState<RiskPrediction | null>(null);
  const [tab, setTab] = useState<ReportTab>("executive");
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<{ splunk_mode: string; graph_nodes: number } | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  async function runAnalysis(query: string) {
    setLoading(true);
    setSelectedNodeId(null);
    setSelectedEventId(null);
    try {
      const [result, riskResult] = await Promise.all([analyzeQuestion(query), fetchRisk()]);
      setReport(result);
      setRisk(riskResult);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealth().then(setHealth);
    runAnalysis(DEFAULT_QUERY);
  }, []);

  function handleNodeSelect(nodeId: string) {
    setSelectedNodeId(nodeId);
    if (!report) return;
    let bestId: string | null = null;
    let bestScore = 0;
    for (const event of report.related_events) {
      const score = eventMatchesNodeLoose(nodeId, event);
      if (score > bestScore) {
        bestScore = score;
        bestId = event.event_id;
      }
    }
    setSelectedEventId(bestId);
  }

  function handleEventSelect(eventId: string) {
    setSelectedEventId(eventId);
    if (!report) return;
    const event = report.related_events.find((e) => e.event_id === eventId);
    if (!event) return;
    let bestNode: string | null = null;
    let bestScore = 0;
    for (const node of report.graph_nodes) {
      const score = eventMatchesNodeLoose(node.id, event);
      if (score > bestScore) {
        bestScore = score;
        bestNode = node.id;
      }
    }
    if (bestNode) setSelectedNodeId(bestNode);
  }

  function handleExport() {
    if (!report) return;
    const content = buildIncidentReport(report, risk, tab);
    downloadReport(content, `synapse-incident-${Date.now()}.md`);
  }

  const timelineEvents = useMemo(() => {
    if (!report) return [];
    if (!selectedNodeId) return report.related_events;
    return report.related_events.filter((e) => eventMatchesNodeLoose(selectedNodeId, e) > 0);
  }, [report, selectedNodeId]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">SY</div>
          <div>
            <h1>Synapse</h1>
            <p>Every incident tells a story. Synapse connects the dots.</p>
          </div>
        </div>
        <div className="topbar-actions">
          {report && (
            <button type="button" className="export-btn" onClick={handleExport}>
              Export report
            </button>
          )}
          <div className="status-pill">
            <span className="status-dot" />
            Splunk {health?.splunk_mode ?? "…"}
            {report ? ` · ${report.graph_nodes.length}-step chain` : ""}
          </div>
        </div>
      </header>

      <main className="layout">
        <section>
          <div className="query-bar">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runAnalysis(question)}
              placeholder="Ask about incidents, services, or operational trends…"
            />
            <button type="button" disabled={loading} onClick={() => runAnalysis(question)}>
              {loading ? "Analyzing…" : "Analyze"}
            </button>
          </div>

          <div className="query-chips">
            {DEMO_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                className={`query-chip ${question === q ? "query-chip-active" : ""}`}
                onClick={() => {
                  setQuestion(q);
                  runAnalysis(q);
                }}
              >
                {q}
              </button>
            ))}
          </div>

          {report ? (
            <>
              <div className="root-cause">
                <h3>Root Cause</h3>
                <p>{report.root_cause}</p>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Incident Timeline</h2>
                    <p className="panel-subtitle">Chronological Splunk events</p>
                  </div>
                </div>
                <div className="panel-body panel-body-tight">
                  <IncidentTimeline
                    events={timelineEvents.length ? timelineEvents : report.related_events}
                    selectedNodeId={selectedNodeId}
                    selectedEventId={selectedEventId}
                    onSelectEvent={handleEventSelect}
                  />
                </div>
              </div>

              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Operational Knowledge Graph</h2>
                    <p className="panel-subtitle">
                      {selectedNodeId ? "Node selected — evidence linked below" : "Incident propagation path"}
                    </p>
                  </div>
                </div>
                <div className="panel-body">
                  <CausalGraph
                    nodes={report.graph_nodes}
                    edges={report.graph_edges}
                    selectedNodeId={selectedNodeId}
                    onNodeSelect={handleNodeSelect}
                  />
                </div>
              </div>

              {risk && (
                <div className="risk-banner">
                  <h3>Early Warning — {risk.service}</h3>
                  <p className="risk-banner-note">Separate signal · not part of the current complaint incident</p>
                  <p>{risk.recommendation}</p>
                  <ul>
                    {risk.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="loading">Loading operational context…</div>
          )}
        </section>

        <aside className="side-stack">
          <div className="panel panel-highlight">
            <div className="panel-header">
              <h2>Causal Chain</h2>
            </div>
            <div className="panel-body">
              {report?.causal_chain.map((link) => (
                <div className="chain-item" key={`${link.from_label}-${link.to_label}`}>
                  <strong>{link.from_label}</strong>
                  <span style={{ color: "var(--text-muted)" }}> → {link.relation.replace(/_/g, " ")} → </span>
                  <strong>{link.to_label}</strong>
                  <p className="summary-text" style={{ fontSize: "0.78rem", marginTop: "0.25rem" }}>
                    {link.evidence.length} Splunk event{link.evidence.length === 1 ? "" : "s"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Impact</h2>
            </div>
            <div className="panel-body">
              {report ? (
                <>
                  <div className="metric-row">
                    <div className="metric">
                      <span>Affected users</span>
                      <strong>{report.impact.estimated_users.toLocaleString()}</strong>
                    </div>
                    <div className="metric">
                      <span>Ticket volume</span>
                      <strong>{report.impact.ticket_volume_delta}</strong>
                    </div>
                  </div>
                  <p className="summary-text" style={{ marginTop: "0.75rem" }}>
                    Services: {report.impact.affected_services.join(", ")}
                  </p>
                </>
              ) : null}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Historical Patterns</h2>
            </div>
            <div className="panel-body">
              {report?.historical_matches.map((match) => (
                <div className="history-item" key={match.incident_id}>
                  <strong>{match.incident_id}</strong> · {match.date}
                  <p className="summary-text">{match.summary}</p>
                  <span className="status-pill">{Math.round(match.similarity * 100)}% topology match</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Report</h2>
              <div className="tabs">
                <button
                  type="button"
                  className={`tab ${tab === "executive" ? "active" : ""}`}
                  onClick={() => setTab("executive")}
                >
                  Executive
                </button>
                <button
                  type="button"
                  className={`tab ${tab === "technical" ? "active" : ""}`}
                  onClick={() => setTab("technical")}
                >
                  Technical
                </button>
              </div>
            </div>
            <div className="panel-body">
              {report ? (
                <p className="summary-text">
                  {tab === "executive" ? report.executive_summary.body : report.technical_summary.body}
                </p>
              ) : (
                <p className="summary-text">—</p>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Splunk Evidence</h2>
              {selectedNodeId && (
                <button type="button" className="graph-reset" onClick={() => setSelectedNodeId(null)}>
                  Clear filter
                </button>
              )}
            </div>
            <div className="panel-body">
              {report ? (
                <EvidencePanel
                  events={report.related_events}
                  selectedNodeId={selectedNodeId}
                  selectedEventId={selectedEventId}
                  onSelectEvent={handleEventSelect}
                />
              ) : null}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
