import type { SplunkEvidence } from "../api";
import { fetchSplunkUrl } from "../api";

interface Props {
  events: SplunkEvidence[];
}

export function EvidencePanel({ events }: Props) {
  async function openInSplunk(query: string) {
    const url = await fetchSplunkUrl(query);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="evidence-list">
      {events.map((event) => (
        <div className="evidence-item" key={event.event_id}>
          <div className="evidence-meta">
            <span>{new Date(event.timestamp).toLocaleString()}</span>
            <span>{event.sourcetype}</span>
            <span>{event.host}</span>
          </div>
          <p>{event.message}</p>
          <button type="button" onClick={() => openInSplunk(event.splunk_query)}>
            View in Splunk
          </button>
        </div>
      ))}
    </div>
  );
}
