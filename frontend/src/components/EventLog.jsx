import { useMemo, useState } from "react";
import "./week4-dashboard.css";

const DEFAULT_EVENTS = [
  { id: 1, time: "14:32:08", type: "BALANCE", region: "North", message: "Load shifted to North hydro reserve", status: "success" },
  { id: 2, time: "14:31:44", type: "ROUTING", region: "West", message: "Power flow rerouted through W-04", status: "info" },
  { id: 3, time: "14:30:17", type: "ALERT", region: "South", message: "South solar output below forecast", status: "warning" },
  { id: 4, time: "14:28:55", type: "AUDIT", region: "Central", message: "Operator policy update recorded", status: "success" },
];

export default function Week4EventLog({ events = DEFAULT_EVENTS, onSimulate }) {
  const [filter, setFilter] = useState("ALL");
  const [paused, setPaused] = useState(false);
  const visibleEvents = useMemo(
    () => filter === "ALL" ? events : events.filter((event) => event.type === filter),
    [events, filter]
  );

  return (
    <section className="week4-panel week4-events-panel" aria-label="Event log">
      <div className="week4-panel-heading">
        <div><h2>Event log</h2><p>System activity and audit trail</p></div>
        <span className="week4-live-label"><i /> LIVE</span>
      </div>
      <div className="week4-filter-row">
        <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter events">
          <option value="ALL">All events</option>
          <option value="BALANCE">Balance</option>
          <option value="ROUTING">Routing</option>
          <option value="ALERT">Alert</option>
          <option value="AUDIT">Audit</option>
        </select>
        <button type="button" onClick={() => setPaused((value) => !value)}>
          {paused ? "▶ Resume live" : "Ⅱ Pause live"}
        </button>
      </div>
      <div className="week4-event-list">
        {visibleEvents.map((event) => (
          <article className="week4-event-row" key={event.id}>
            <span className={`week4-event-icon ${event.status}`}>{event.type === "ALERT" ? "!" : "✓"}</span>
            <div className="week4-event-copy"><div><strong>{event.type}</strong><span>{event.region}</span></div><p>{event.message}</p></div>
            <time>{event.time}</time>
          </article>
        ))}
        {!visibleEvents.length && <p className="week4-empty">No events in this category.</p>}
      </div>
      <button className="week4-load-button" type="button" onClick={onSimulate}>＋ Record audit event</button>
    </section>
  );
}
