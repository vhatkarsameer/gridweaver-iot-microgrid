import { useMemo, useState } from "react";
import "./dashboard.css";

export default function EventLog({ events = [] }) {
  const [filter, setFilter] = useState("ALL");
  const visibleEvents = useMemo(() => filter === "ALL" ? events : events.filter((event) => event.type === filter), [events, filter]);
  const filters = ["ALL", ...new Set(events.map((event) => event.type))];
  return <section className="dashboard-panel dashboard-events-panel" aria-label="Live event log">
    <div className="dashboard-panel-heading"><div><h2>Event log</h2><p>Live WebSocket state transitions and telemetry</p></div><span className="dashboard-live-label"><i /> LIVE</span></div>
    <div className="dashboard-filter-row"><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter live events">{filters.map((value) => <option key={value} value={value}>{value === "ALL" ? "All events" : value}</option>)}</select><span className="dashboard-event-count">{events.length} tracked</span></div>
    <div className="dashboard-event-list">
      {visibleEvents.map((event) => <article className="dashboard-event-row" key={event.id}><span className={`dashboard-event-icon ${event.status}`}>{event.status === "warning" ? "!" : "✓"}</span><div className="dashboard-event-copy"><div><strong>{event.type}</strong><span>{event.region}</span></div><p title={event.message}>{event.message}</p><small>{event.deviceId} · {event.deviceType}</small></div><time>{event.time}</time></article>)}
      {!visibleEvents.length && <p className="dashboard-empty">Waiting for live state transitions…</p>}
    </div>
  </section>;
}
