import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import DeviceMarker from "./DeviceMarker.jsx";
import { mockTelemetry } from "../data/mockTelemetry.js";

const MUMBAI_CENTER = [19.076, 72.8777];

export default function GridMap({ telemetry, onDeviceSelect }) {
  const devices = Array.isArray(telemetry) && telemetry.length > 0
    ? telemetry
    : mockTelemetry;

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

        {devices.map((device ) => (
          <DeviceMarker
            key={device.deviceId}
            telemetry={device}
            onSelect={onDeviceSelect}
          />
        ))}
      </MapContainer>
    </section>
  );
}
