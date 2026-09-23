import { useState } from "react";
import type { AgentTrace } from "../api";

interface Props {
  trace: AgentTrace;
}

export function AgentTracePanel({ trace }: Props) {
  const [copied, setCopied] = useState(false);

  async function copySpl() {
    if (!trace.generated_spl) return;
    try {
      await navigator.clipboard.writeText(trace.generated_spl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="panel panel-mcp">
      <div className="panel-header">
        <h2>Agent investigation</h2>
        <span className="mcp-badge">{trace.mode}</span>
      </div>
      <div className="panel-body">
        {trace.generated_spl && (
          <div className="mcp-spl">
            <div className="mcp-spl-head">
              <strong>Generated SPL</strong>
              <button type="button" className="mcp-copy" onClick={copySpl}>
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <code>{trace.generated_spl}</code>
          </div>
        )}
        <ol className="mcp-steps">
          {trace.steps.map((step, index) => (
            <li key={`${index}-${step.tool}`}>
              <div className="mcp-step-head">
                <strong>
                  <span className="mcp-step-num">{index + 1}.</span> {step.tool}
                </strong>
                <span>{step.duration_ms}ms</span>
              </div>
              <p className="summary-text">{step.output_summary}</p>
            </li>
          ))}
        </ol>
        <p className="summary-text mcp-footnote">
          Powered by Splunk MCP Server tools — generate_spl, run_splunk_query, get_indexes.
        </p>
      </div>
    </div>
  );
}
