import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { TelemetryPayload } from "../types/telemetry";

interface DeviceMarkerProps {
  telemetry: TelemetryPayload;
  onSelect?: (telemetry: TelemetryPayload) => void;
}

const statusColors: Record<string, string> = {
  IDLE: "#64748b",
  CHARGING: "#06b6d4",
  DISCHARGING: "#f59e0b",
  FAULT: "#ef4444",
};

const deviceSymbols: Record<string, string> = {
  SOLAR: "☀",
  BATTERY: "▣",
  GRID: "⚡",
};

function formatPower(outputWatts: number): string {
  return `${(outputWatts / 1000).toFixed(1)} kW`;
}

export default function DeviceMarker({
  telemetry,
  onSelect,
}: DeviceMarkerProps) {
  const color = statusColors[telemetry.status] ?? "#64748b";
  const symbol = deviceSymbols[telemetry.deviceType] ?? "•";

  const markerIcon = useMemo(
    () =>
      L.divIcon({
        className: "gridweaver-device-marker",
        html: `
          <div
            style="
              width: 34px;
              height: 34px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              background: ${color};
              border: 3px solid white;
              color: white;
              font-size: 16px;
              font-weight: 700;
              box-shadow: 0 0 0 5px ${color}33, 0 4px 12px rgba(15, 23, 42, 0.28);
            "
          >
            ${symbol}
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        popupAnchor: [0, -18],
      }),
    [color, symbol],
  );

  return (
    <Marker
      position={[telemetry.latitude, telemetry.longitude]}
      icon={markerIcon}
      eventHandlers={{
        click: () => onSelect?.(telemetry),
      }}
    >
      <Popup>
        <div style={{ minWidth: "190px" }}>
          <strong>{telemetry.deviceId}</strong>

          <dl
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px 12px",
              marginTop: "10px",
              fontSize: "13px",
            }}
          >
            <dt>Type</dt>
            <dd>{telemetry.deviceType}</dd>

            <dt>Status</dt>
            <dd style={{ color, fontWeight: 700 }}>{telemetry.status}</dd>

            <dt>Output</dt>
            <dd>{formatPower(telemetry.outputWatts)}</dd>

            <dt>Battery</dt>
            <dd>{telemetry.batteryLevelPct}%</dd>
          </dl>
        </div>
      </Popup>
    </Marker>
  );
}
