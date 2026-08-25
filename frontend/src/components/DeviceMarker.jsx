import { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";

const statusColors = {
  IDLE: "#64748b",
  CHARGING: "#06b6d4",
  DISCHARGING: "#f59e0b",
  FAULT: "#ef4444",
};

const deviceSymbols = {
  SOLAR: "☀️",
  SOLAR_PANEL: "☀️",
  BATTERY: "▣",
  GRID: "⚡",
};

export default function DeviceMarker({ telemetry, onSelect }) {
  const color = statusColors[telemetry.status] || "#64748b";
  const symbol = deviceSymbols[telemetry.deviceType] || "•";

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
      }),
    [color, symbol],
  );

  return (
    <Marker
      position={[telemetry.latitude, telemetry.longitude]}
      icon={markerIcon}
      eventHandlers={{
        click: (e) => {
          // Prevent map click propagation and pass full telemetry up
          e.originalEvent?.stopPropagation?.();
          if (onSelect) {
            onSelect(telemetry);
          }
        },
      }}
    />
  );
}