function formatNumber(value, digits = 0) {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString(undefined, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : '0';
}

function formatTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleTimeString();
}

function statusClass(status) {
  return String(status || 'UNKNOWN').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export default function MonitoringDashboard({ metrics }) {
  const recentEvents = metrics?.recentEvents ?? [];
  const successRate = Number(metrics?.successRate ?? 0);

  return (
    <section className="monitoring-section" aria-labelledby="monitoring-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">WEEK 3 STREAM MONITORING</p>
          <h2 id="monitoring-title">Kafka processing dashboard</h2>
          <p className="section-description">
            Live throughput and processing health for the telemetry pipeline.
          </p>
        </div>
        <span className="event-status-badge">
          {metrics?.lastEventAt ? `Last event ${formatTime(metrics.lastEventAt)}` : 'Waiting for events'}
        </span>
      </div>

      <div className="monitoring-stats-grid">
        <article className="monitoring-stat-card">
          <span>Throughput</span>
          <strong>{formatNumber(metrics?.throughputPerSecond, 1)} events/s</strong>
          <small>{formatNumber(metrics?.receivedEvents)} received in the window</small>
        </article>
        <article className="monitoring-stat-card">
          <span>Active devices</span>
          <strong>{formatNumber(metrics?.activeDevices)}</strong>
          <small>Devices currently represented on the map</small>
        </article>
        <article className="monitoring-stat-card">
          <span>Processed events</span>
          <strong>{formatNumber(metrics?.processedEvents)}</strong>
          <small>{formatNumber(successRate, 1)}% successful</small>
        </article>
        <article className="monitoring-stat-card">
          <span>Processing errors</span>
          <strong className={metrics?.failedEvents ? 'metric-danger' : 'metric-success'}>
            {formatNumber(metrics?.failedEvents)}
          </strong>
          <small>Failed or rejected telemetry events</small>
        </article>
        <article className="monitoring-stat-card">
          <span>Avg processing time</span>
          <strong>{formatNumber(metrics?.averageProcessingMs, 1)} ms</strong>
          <small>Backend processing duration</small>
        </article>
        <article className="monitoring-stat-card">
          <span>Avg event latency</span>
          <strong>{formatNumber(metrics?.averageLatencyMs, 1)} ms</strong>
          <small>Event timestamp to UI receipt</small>
        </article>
      </div>

      <div className="event-table-card">
        <div className="event-table-heading">
          <h3>Recent telemetry events</h3>
          <span>{recentEvents.length} displayed</span>
        </div>
        {recentEvents.length === 0 ? (
          <p className="empty-events">Waiting for Kafka telemetry events…</p>
        ) : (
          <div className="event-table-scroll">
            <table className="event-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event type</th>
                  <th>Device</th>
                  <th>Status</th>
                  <th>Partition</th>
                  <th>Offset</th>
                  <th>Processing</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event) => (
                  <tr key={event.id}>
                    <td>{formatTime(event.timestamp)}</td>
                    <td>{event.eventType || 'TELEMETRY'}</td>
                    <td>{event.deviceId || '—'}</td>
                    <td>
                      <span className={`event-status ${statusClass(event.status)}`}>
                        {event.status || 'UNKNOWN'}
                      </span>
                    </td>
                    <td>{event.partition ?? '—'}</td>
                    <td>{event.offset ?? '—'}</td>
                    <td>{event.processingMs == null ? '—' : `${formatNumber(event.processingMs, 1)} ms`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
