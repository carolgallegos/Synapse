import type { AgentTrace } from "../api";

interface Props {
  trace: AgentTrace;
}

export function AgentTracePanel({ trace }: Props) {
  return (
    <div className="panel panel-mcp">
      <div className="panel-header">
        <h2>Agent investigation</h2>
        <span className="mcp-badge">{trace.mode}</span>
      </div>
      <div className="panel-body">
        {trace.generated_spl && (
          <p className="mcp-spl">
            <strong>Generated SPL:</strong> <code>{trace.generated_spl}</code>
          </p>
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
