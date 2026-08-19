import { CircleMarker, Popup } from "react-leaflet";
import L from "leaflet";

const statusColors = {
  IDLE: "#64748b",
  CHARGING: "#06b6d4",
  DISCHARGING: "#f59e0b",
  FAULT: "#ef4444",
};

const deviceLabels = {
  SOLAR: "Solar panel",
  SOLAR_PANEL: "Solar panel",
  BATTERY: "Battery",
  GRID: "Grid node",
};

// Reuse one Canvas renderer for all devices.
// This avoids creating one DOM element per marker.
const canvasRenderer = L.canvas({ padding: 0.5 });

function formatPower(outputWatts) {
  return `${(Number(outputWatts || 0) / 1000).toFixed(1)} kW`;
}

function formatTimestamp(timestamp) {
  if (!timestamp) return "Unavailable";

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Invalid timestamp";

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export default function DeviceMarker({ telemetry, onSelect }) {
  const color = statusColors[telemetry.status] || statusColors.IDLE;
  const deviceLabel =
    deviceLabels[telemetry.deviceType] || telemetry.deviceType || "Unknown";

  return (
    <CircleMarker
      center={[Number(telemetry.latitude), Number(telemetry.longitude)]}
      radius={5}
      renderer={canvasRenderer}
      pathOptions={{
        color,
        weight: 1,
        opacity: 0.9,
        fillColor: color,
        fillOpacity: 0.85,
      }}
      eventHandlers={{
        click: () => onSelect?.(telemetry),
      }}
    >
      <Popup>
        <div style={{ minWidth: "220px", fontFamily: "Arial, sans-serif" }}>
          <strong style={{ fontFamily: "monospace", fontSize: "15px" }}>
            {telemetry.deviceId}
          </strong>

          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px 12px",
              margin: "12px 0 0",
              fontSize: "13px",
            }}
          >
            <dt>Type</dt>
            <dd style={{ margin: 0 }}>{deviceLabel}</dd>

            <dt>Status</dt>
            <dd style={{ color, fontWeight: 700, margin: 0 }}>
              {telemetry.status}
            </dd>

            <dt>Output</dt>
            <dd style={{ margin: 0 }}>{formatPower(telemetry.outputWatts)}</dd>

            <dt>Battery</dt>
            <dd style={{ margin: 0 }}>
              {Number(telemetry.batteryLevelPct || 0).toFixed(1)}%
            </dd>

            <dt>Latitude</dt>
            <dd style={{ margin: 0 }}>
              {Number(telemetry.latitude).toFixed(4)}
            </dd>

            <dt>Longitude</dt>
            <dd style={{ margin: 0 }}>
              {Number(telemetry.longitude).toFixed(4)}
            </dd>

            <dt>Last updated</dt>
            <dd style={{ margin: 0, textAlign: "right", fontSize: "12px" }}>
              {formatTimestamp(telemetry.timestamp)}
            </dd>
          </dl>
        </div>
      </Popup>
    </CircleMarker>
  );
}

