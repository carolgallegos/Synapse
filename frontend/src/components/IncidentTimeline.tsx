import type { SplunkEvidence } from "../api";
import { shortEventLabel } from "../utils/nodeEvidence";

interface Props {
  events: SplunkEvidence[];
  selectedEventId: string | null;
  onSelectEvent: (eventId: string) => void;
}

export function IncidentTimeline({ events, selectedEventId, onSelectEvent }: Props) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  if (!sorted.length) return null;

  const start = new Date(sorted[0].timestamp).getTime();
  const end = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const span = Math.max(end - start, 1);
  const windowLabel = `${new Date(start).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })} – ${new Date(end).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  return (
    <div className="incident-timeline">
      <p className="timeline-window">
        {sorted.length} event{sorted.length === 1 ? "" : "s"} · {windowLabel}
      </p>
      <div className="timeline-track">
        {sorted.map((event) => {
          const pct = ((new Date(event.timestamp).getTime() - start) / span) * 100;
          const active = selectedEventId === event.event_id;
          return (
            <button
              key={event.event_id}
              type="button"
              className={`timeline-dot ${active ? "timeline-dot-active" : ""}`}
              style={{ left: `${Math.min(Math.max(pct, 4), 96)}%` }}
              title={event.message}
              onClick={() => onSelectEvent(event.event_id)}
            >
              <span className="timeline-dot-inner" />
            </button>
          );
        })}
      </div>
      <div className="timeline-labels">
        {sorted.map((event) => (
          <div className="timeline-label" key={`label-${event.event_id}`}>
            <time>{new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
            <span>{shortEventLabel(event.message)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
