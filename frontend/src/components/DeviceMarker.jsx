import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

const statusColors = {
  IDLE: "#64748b",
  CHARGING: "#06b6d4",
  DISCHARGING: "#f59e0b",
  FAULT: "#ef4444",
};

const deviceSymbols = {
  SOLAR: "☀",
  SOLAR_PANEL: "☀",
  BATTERY: "▣",
  GRID: "⚡",
};

const deviceLabels = {
  SOLAR: "Solar panel",
  SOLAR_PANEL: "Solar panel",
  BATTERY: "Battery",
  GRID: "Grid node",
};

function formatPower(outputWatts) {
  return `${(Number(outputWatts || 0) / 1000).toFixed(1)} kW`;
}

export default function DeviceMarker({ telemetry, onSelect }) {
  const color = statusColors[telemetry.status] || "#64748b";
  const symbol = deviceSymbols[telemetry.deviceType] || "•";
  const deviceLabel = deviceLabels[telemetry.deviceType] || telemetry.deviceType;

  const markerIcon = useMemo(
    () =>
      L.divIcon({
        className: "gridweaver-device-marker",
        html: `
          <div
            style="
              width: 36px;
              height: 36px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              background: ${color};
              border: 3px solid #ffffff;
              color: #ffffff;
              font-size: 17px;
              font-weight: 700;
              box-shadow: 0 0 0 5px ${color}33, 0 4px 12px rgba(15, 23, 42, 0.28);
            "
          >
            ${symbol}
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
      }),
    [color, symbol],
  );

  return (
    <Marker
      position={[telemetry.latitude, telemetry.longitude]}
      icon={markerIcon}
      eventHandlers={{
        click: () => {
          if (onSelect) onSelect(telemetry);
        },
      }}
    >
      <Popup>
        <div style={{ minWidth: "210px", fontFamily: "Arial, sans-serif" }}>
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
            <dd style={{ margin: 0 }}>{telemetry.latitude.toFixed(4)}</dd>

            <dt>Longitude</dt>
            <dd style={{ margin: 0 }}>{telemetry.longitude.toFixed(4)}</dd>
          </dl>
        </div>
      </Popup>
    </Marker>
  );
}
