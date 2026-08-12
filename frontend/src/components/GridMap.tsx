import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import DeviceMarker from "./DeviceMarker";
import { mockTelemetry } from "../data/mockTelemetry";
import type { TelemetryPayload } from "../types/telemetry";

interface GridMapProps {
  onDeviceSelect?: (telemetry: TelemetryPayload) => void;
}

const MUMBAI_CENTER: [number, number] = [19.076, 72.8777];

export default function GridMap({ onDeviceSelect }: GridMapProps) {
  return (
    <section
      aria-label="Mumbai microgrid map"
      style={{
        width: "100%",
        height: "100%",
        minHeight: "520px",
        overflow: "hidden",
        borderRadius: "12px",
      }}
    >
      <MapContainer
        center={MUMBAI_CENTER}
        zoom={11}
        minZoom={9}
        maxZoom={18}
        scrollWheelZoom={true}
        style={{ width: "100%", height: "100%", minHeight: "520px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mockTelemetry.map((telemetry ) => (
          <DeviceMarker
            key={telemetry.deviceId}
            telemetry={telemetry}
            onSelect={onDeviceSelect}
          />
        ))}
      </MapContainer>
    </section>
  );
}
