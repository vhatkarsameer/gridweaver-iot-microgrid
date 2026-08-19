import { useMemo } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
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

  // Prevent unnecessary rebuilding of the device list when unrelated UI state changes.
  const deviceMarkers = useMemo(
    () =>
      devices.map((device) => (
        <DeviceMarker
          key={device.deviceId}
          telemetry={device}
          onSelect={onDeviceSelect}
        />
      )),
    [devices, onDeviceSelect],
  );

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
        scrollWheelZoom={true}
        preferCanvas={true}
        zoomAnimation={false}
        markerZoomAnimation={false}
        style={{ width: "100%", height: "100%", minHeight: "540px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          updateWhenZooming={false}
          updateWhenIdle={true}
          keepBuffer={1}
        />

        {deviceMarkers}
      </MapContainer>

      <div
        style={{
          position: "absolute",
          bottom: "24px",
          right: "24px",
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(8px)",
          border: "1px solid #cbd5e1",
          borderRadius: "10px",
          padding: "14px 16px",
          boxShadow: "0 10px 25px rgba(15, 23, 42, 0.15)",
          fontFamily: "Arial, sans-serif",
          fontSize: "12px",
          color: "#0f172a",
          maxWidth: "240px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px",
            borderBottom: "1px solid #e2e8f0",
            paddingBottom: "6px",
          }}
        >
          <strong style={{ fontSize: "13px" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px" }}>☀</span>
            <span>Solar Array (Active)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "14px" }}>▣</span>
            <span>Home Battery Storage</span>
          </div>

          <div
            style={{
              margin: "4px 0",
              borderTop: "1px solid #f1f5f9",
              paddingTop: "6px",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "4px", color: "#475569" }}>
              Status Indicators
            </div>
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
