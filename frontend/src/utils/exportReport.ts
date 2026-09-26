import type { AnalysisReport, RiskPrediction } from "../api";

export function buildIncidentReport(
  report: AnalysisReport,
  risk: RiskPrediction | null,
  format: "executive" | "technical" = "executive",
): string {
  const lines = [
    "SYNAPSE — INCIDENT REPORT",
    "",
    `Query: ${report.query}`,
    "",
    "ROOT CAUSE",
    report.root_cause,
    "",
  ];

  if (report.agent_trace) {
    lines.push(
      "AGENT INVESTIGATION",
      `  Mode: ${report.agent_trace.mode}`,
    );
    if (report.agent_trace.generated_spl) {
      lines.push(`  Generated SPL: ${report.agent_trace.generated_spl}`);
    }
    lines.push(
      ...report.agent_trace.steps.map(
        (step, index) =>
          `  ${index + 1}. ${step.tool} (${step.duration_ms}ms) — ${step.output_summary}`,
      ),
      "",
    );
  }

  lines.push(
    "CAUSAL CHAIN",
    ...report.causal_chain.map(
      (link) =>
        `  ${link.from_label} → ${link.relation.replace(/_/g, " ")} → ${link.to_label} (${link.evidence.length} Splunk events)`,
    ),
    "",
    "IMPACT",
    `  Affected users: ${report.impact.estimated_users.toLocaleString()}`,
    `  Ticket volume: ${report.impact.ticket_volume_delta}`,
    `  Services: ${report.impact.affected_services.join(", ")}`,
    "",
    "HISTORICAL PATTERNS",
    ...report.historical_matches.map(
      (m) => `  ${m.incident_id} (${m.date}) — ${Math.round(m.similarity * 100)}% match — ${m.summary}`,
    ),
    "",
    format === "executive" ? "EXECUTIVE SUMMARY" : "TECHNICAL SUMMARY",
    format === "executive" ? report.executive_summary.body : report.technical_summary.body,
    "",
    "SPLUNK EVIDENCE",
    ...report.related_events.map(
      (e) => `  [${new Date(e.timestamp).toISOString()}] ${e.sourcetype} — ${e.message}`,
    ),
  ];

  if (risk) {
    lines.push(
      "",
      "EARLY WARNING (SEPARATE SIGNAL)",
      `  ${risk.service} — risk score ${Math.round(risk.risk_score * 100)}%`,
      `  ${risk.recommendation}`,
      ...risk.reasons.map((r) => `  · ${r}`),
    );
  }

  lines.push("", "— Synapse incident report");
  return lines.join("\n");
}

export function downloadReport(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
