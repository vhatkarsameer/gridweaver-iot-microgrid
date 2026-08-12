import { useMemo, useState } from "react";

import GridMap from "../components/GridMap";
import type { TelemetryPayload } from "../types/telemetry";
import { mockTelemetry } from "../data/mockTelemetry";

function formatPower(outputWatts: number): string {
  return `${(outputWatts / 1000).toFixed(1)} kW`;
}

export default function Home() {
  const [selectedDevice, setSelectedDevice] =
    useState<TelemetryPayload | null>(null);

  const metrics = useMemo(() => {
    const totalOutputWatts = mockTelemetry.reduce(
      (total, device) => total + device.outputWatts,
      0,
    );

    const activeDevices = mockTelemetry.filter(
      (device) => device.status !== "IDLE" && device.status !== "FAULT",
    ).length;

    const faultCount = mockTelemetry.filter(
      (device) => device.status === "FAULT",
    ).length;

    const batteryDevices = mockTelemetry.filter(
      (device) => device.deviceType === "BATTERY",
    );

    const averageBatteryLevel = batteryDevices.length
      ? batteryDevices.reduce(
          (total, device) => total + device.batteryLevelPct,
          0,
        ) / batteryDevices.length
      : 0;

    return {
      totalOutputWatts,
      activeDevices,
      faultCount,
      averageBatteryLevel,
    };
  }, []);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#0f172a",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
          padding: "18px 28px",
          background: "#1e3a5f",
          color: "white",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity: 0.72,
            }}
          >
            GridWeaver Operations
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: "26px" }}>
            Mumbai Grid Overview
          </h1>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "13px", opacity: 0.75 }}>
            Telemetry status
          </div>
          <strong style={{ color: "#6ee7b7" }}>Static preview connected</strong>
        </div>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "14px",
          padding: "22px 28px 0",
        }}
      >
        <MetricCard
          label="Total output"
          value={formatPower(metrics.totalOutputWatts)}
          color="#06b6d4"
        />
        <MetricCard
          label="Active devices"
          value={String(metrics.activeDevices)}
          color="#10b981"
        />
        <MetricCard
          label="Battery average"
          value={`${metrics.averageBatteryLevel.toFixed(0)}%`}
          color="#f59e0b"
        />
        <MetricCard
          label="Faults"
          value={String(metrics.faultCount)}
          color={metrics.faultCount > 0 ? "#ef4444" : "#10b981"}
        />
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 320px",
          gap: "18px",
          padding: "22px 28px 28px",
        }}
      >
        <div
          style={{
            minWidth: 0,
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "12px",
          }}
        >
          <GridMap onDeviceSelect={setSelectedDevice} />
        </div>

        <aside
          style={{
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            padding: "20px",
            alignSelf: "start",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#64748b",
            }}
          >
            Selected device
          </div>

          {selectedDevice ? (
            <div style={{ marginTop: "14px" }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: "IBM Plex Mono, monospace",
                  fontSize: "20px",
                }}
              >
                {selectedDevice.deviceId}
              </h2>

              <div style={{ marginTop: "18px", display: "grid", gap: "12px" }}>
                <DetailRow label="Type" value={selectedDevice.deviceType} />
                <DetailRow label="Status" value={selectedDevice.status} />
                <DetailRow
                  label="Output"
                  value={formatPower(selectedDevice.outputWatts)}
                />
                <DetailRow
                  label="Battery"
                  value={`${selectedDevice.batteryLevelPct}%`}
                />
                <DetailRow
                  label="Coordinates"
                  value={`${selectedDevice.latitude.toFixed(4)}, ${selectedDevice.longitude.toFixed(4)}`}
                />
              </div>
            </div>
          ) : (
            <p style={{ color: "#64748b", lineHeight: 1.6 }}>
              Select a marker on the Mumbai map to inspect its telemetry.
            </p>
          )}
        </aside>
      </section>
    </main>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  color: string;
}

function MetricCard({ label, value, color }: MetricCardProps) {
  return (
    <article
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderTop: `3px solid ${color}`,
        borderRadius: "10px",
        padding: "16px 18px",
      }}
    >
      <div style={{ color: "#64748b", fontSize: "13px" }}>{label}</div>
      <div
        style={{
          marginTop: "8px",
          color: "#0f172a",
          fontFamily: "IBM Plex Mono, monospace",
          fontSize: "24px",
          fontWeight: 600,
        }}
      >
        {value}
      </div>
    </article>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        fontSize: "13px",
      }}
    >
      <span style={{ color: "#64748b" }}>{label}</span>
      <strong style={{ textAlign: "right" }}>{value}</strong>
    </div>
  );
}
