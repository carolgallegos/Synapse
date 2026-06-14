import { useEffect, useRef } from "react";
import type { SplunkEvidence } from "../api";
import { fetchSplunkUrl } from "../api";
import { eventMatchesNode } from "../utils/nodeEvidence";

interface Props {
  events: SplunkEvidence[];
  selectedNodeId: string | null;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
}

export function EvidencePanel({ events, selectedNodeId, selectedEventId, onSelectEvent }: Props) {
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (selectedEventId && refs.current[selectedEventId]) {
      refs.current[selectedEventId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedEventId]);

  async function openInSplunk(query: string) {
    const url = await fetchSplunkUrl(query);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const visible = selectedNodeId
    ? events.filter((event) => eventMatchesNode(selectedNodeId, event))
    : events;

  return (
    <div className="evidence-list">
      {selectedNodeId && visible.length === 0 && (
        <p className="summary-text">No direct Splunk events for this node.</p>
      )}
      {(visible.length ? visible : events).map((event) => {
        const highlighted =
          selectedEventId === event.event_id ||
          (selectedNodeId ? eventMatchesNode(selectedNodeId, event) : false);
        return (
          <div
            className={`evidence-item ${highlighted ? "evidence-item-active" : ""}`}
            key={event.event_id}
            ref={(el) => {
              refs.current[event.event_id] = el;
            }}
            onClick={() => onSelectEvent(event.event_id)}
            onKeyDown={(e) => e.key === "Enter" && onSelectEvent(event.event_id)}
            role="button"
            tabIndex={0}
          >
            <div className="evidence-meta">
              <span>{new Date(event.timestamp).toLocaleString()}</span>
              <span>{event.sourcetype}</span>
              <span>{event.host}</span>
            </div>
            <p>{event.message}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openInSplunk(event.splunk_query);
              }}
            >
              View in Splunk
            </button>
          </div>
        );
      })}
    </div>
  );
}
