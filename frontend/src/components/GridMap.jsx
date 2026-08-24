import { MapContainer, TileLayer } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";

import DeviceMarker from "./DeviceMarker.jsx";
import { mockTelemetry } from "../data/mockTelemetry.js";

const MAHARASHTRA_CENTER = [19.7515, 75.7139];

const MAHARASHTRA_BOUNDS = [
  [15.5, 72.0],
  [22.2, 81.5],
];

export default function GridMap({ telemetry, onDeviceSelect }) {
  const devices =
    Array.isArray(telemetry) && telemetry.length > 0
      ? telemetry
      : mockTelemetry;

  const isUsingMock = !Array.isArray(telemetry) || telemetry.length === 0;

  return (
    <section
      aria-label="Maharashtra microgrid map"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "540px",
        overflow: "hidden",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(15, 23, 42, 0.08)",
      }}
    >
      <MapContainer
        center={MAHARASHTRA_CENTER}
        zoom={7}
        minZoom={5}
        maxZoom={18}
        maxBounds={MAHARASHTRA_BOUNDS}
        maxBoundsViscosity={0.25}
        scrollWheelZoom
        preferCanvas
        zoomAnimation={false}
        markerZoomAnimation={false}
        style={{ width: "100%", height: "100%", minHeight: "540px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          updateWhenZooming={false}
          updateWhenIdle
          keepBuffer={1}
        />

        <MarkerClusterGroup
          chunkedLoading
          chunkInterval={100}
          chunkDelay={25}
          removeOutsideVisibleBounds
          animate={false}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          maxClusterRadius={60}
        >
          {devices.map((device) => (
            <DeviceMarker
              key={device.deviceId}
              telemetry={device}
              onSelect={onDeviceSelect}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      <div
        className="map-legend"
        style={{
          position: "absolute",
          bottom: "24px",
          right: "24px",
          zIndex: 1000,
        }}
      >
        <div className="map-legend-header">
          <strong className="map-legend-title">
            Maharashtra Microgrid Legend
          </strong>
          <span
            style={{
              fontSize: "10px",
              padding: "2px 6px",
              borderRadius: "4px",
              fontWeight: 700,
              background: isUsingMock ? "#fef3c7" : "#d1fae5",
              color: isUsingMock ? "#d97706" : "#059669",
            }}
          >
            {isUsingMock ? "WEEK 1 MOCK" : "LIVE STOMP"}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div>☀ Solar Array (Active)</div>
          <div>▣ Home Battery Storage</div>

          <div
            style={{
              margin: "4px 0",
              borderTop: "1px solid var(--divider-color, #e2e8f0)",
              paddingTop: "6px",
            }}
          >
            <div className="map-legend-section-title">Status Indicators</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px" }}>
              <LegendItem color="#06b6d4" label="Charging" />
              <LegendItem color="#f59e0b" label="Discharging" />
              <LegendItem color="#64748b" label="Idle" />
              <LegendItem color="#ef4444" label="Fault" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      <span>{label}</span>
    </div>
  );
}
