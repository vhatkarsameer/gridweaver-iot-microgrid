import React, { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import "./App.css";

import GridMap from "./components/GridMap.jsx";
import { mockTelemetry } from "./data/mockTelemetry.js";

const statusColors = {
  IDLE: "#64748b",
  CHARGING: "#06b6d4",
  DISCHARGING: "#f59e0b",
  FAULT: "#ef4444",
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("app-theme");
    return savedTheme === "dark";
  });

  useEffect(() => {
    localStorage.setItem("app-theme", isDarkMode ? "dark" : "light");
    if (isDarkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [isDarkMode]);

  const [householdMap, setHouseholdMap] = useState({});
  const [connected, setConnected] = useState(false);
  const [gridSummary, setGridSummary] = useState(null);

  // Track the full selected device object in state for the persistent overlay card
  const [selectedDeviceObj, setSelectedDeviceObj] = useState(null);

  useEffect(() => {
      // 1. Create a silent buffer outside of React state
      let messageBuffer = [];

      const client = new Client({
        brokerURL: "ws://localhost:8080/ws-grid",
        reconnectDelay: 3000,
        onConnect: () => {
          setConnected(true);

          client.subscribe("/topic/telemetry", (message) => {
            if (!message.body) return;
            const payload = JSON.parse(message.body);

            if (payload.deviceType === "BATTERY") {
              payload.latitude += 0.0001;
              payload.longitude += 0.0001;
            }

            // 2. Just push to the buffer. DO NOT trigger a React state update here.
            messageBuffer.push(payload);
          });

          client.subscribe("/topic/grid-state", (message) => {
            if (!message.body) return;
            setGridSummary(JSON.parse(message.body));
          });
        },
        onWebSocketClose: () => setConnected(false),
        onDisconnect: () => setConnected(false),
        onStompError: () => setConnected(false),
      });

      client.activate();

      // 3. Flush the buffer into React state exactly once every 1000ms
      const flushInterval = setInterval(() => {
        if (messageBuffer.length === 0) return;

        // Take a snapshot of the current buffer and instantly clear it
        const currentBatch = [...messageBuffer];
        messageBuffer = [];

        setHouseholdMap((previousMap) => {
          // Clone the map once per batch, not once per message
          const updatedMap = { ...previousMap };

          currentBatch.forEach((payload) => {
            const houseId = payload.deviceId
              .replace("SOLAR-", "")
              .replace("BATT-", "");

            if (!updatedMap[houseId]) {
              updatedMap[houseId] = {
                houseId,
                latitude: payload.latitude,
                longitude: payload.longitude,
                solar: null,
                battery: null,
              };
            }

            if (payload.deviceType === "SOLAR_PANEL") {
              updatedMap[houseId].solar = payload;
            } else if (payload.deviceType === "BATTERY") {
              updatedMap[houseId].battery = payload;
            }
          });

          return updatedMap;
        });
      }, 1000); // UI updates only once per second

      return () => {
        clearInterval(flushInterval);
        client.deactivate();
      };

    }, []);
useEffect(() => {
               // 1. Create a silent buffer outside of React state
               let messageBuffer = [];

               const client = new Client({
                 brokerURL: "ws://localhost:8080/ws-grid",
                 reconnectDelay: 3000,
                 onConnect: () => {
                   setConnected(true);

                   client.subscribe("/topic/telemetry", (message) => {
                     if (!message.body) return;
                     const payload = JSON.parse(message.body);

                     if (payload.deviceType === "BATTERY") {
                       payload.latitude += 0.0001;
                       payload.longitude += 0.0001;
                     }

                     // 2. Just push to the buffer. DO NOT trigger a React state update here.
                     messageBuffer.push(payload);
                   });

                   client.subscribe("/topic/grid-state", (message) => {
                     if (!message.body) return;
                     setGridSummary(JSON.parse(message.body));
                   });
                 },
                 onWebSocketClose: () => setConnected(false),
                 onDisconnect: () => setConnected(false),
                 onStompError: () => setConnected(false),
               });

               client.activate();

               // 3. Flush the buffer into React state exactly once every 1000ms
               const flushInterval = setInterval(() => {
                 if (messageBuffer.length === 0) return;

                 // Take a snapshot of the current buffer and instantly clear it
                 const currentBatch = [...messageBuffer];
                 messageBuffer = [];

                 setHouseholdMap((previousMap) => {
                   // Clone the map once per batch, not once per message
                   const updatedMap = { ...previousMap };

                   currentBatch.forEach((payload) => {
                     const houseId = payload.deviceId
                       .replace("SOLAR-", "")
                       .replace("BATT-", "");

                     if (!updatedMap[houseId]) {
                       updatedMap[houseId] = {
                         houseId,
                         latitude: payload.latitude,
                         longitude: payload.longitude,
                         solar: null,
                         battery: null,
                       };
                     }

                     if (payload.deviceType === "SOLAR_PANEL") {
                       updatedMap[houseId].solar = payload;
                     } else if (payload.deviceType === "BATTERY") {
                       updatedMap[houseId].battery = payload;
                     }
                   });

                   return updatedMap;
                 });
               }, 1000); // UI updates only once per second

               return () => {
                 clearInterval(flushInterval);
                 client.deactivate();
               };
             }, []);

  const households = Object.values(householdMap);

  const totalSolarWatts = households.reduce(
    (sum, house) => sum + (house.solar ? house.solar.outputWatts : 0),
    0,
  );

  const totalBatteryWatts = households.reduce(
    (sum, house) => sum + (house.battery ? house.battery.outputWatts : 0),
    0,
  );

  const liveTelemetry = households.flatMap((house) =>
    [house.solar, house.battery].filter(Boolean),
  );

  const mapTelemetry = liveTelemetry.length > 0 ? liveTelemetry : mockTelemetry;

  // Continuously bind the selected device to the live telemetry stream so values tick live
  const activeSelectedDevice = selectedDeviceObj
    ? mapTelemetry.find(t => t.deviceId === selectedDeviceObj.deviceId) || selectedDeviceObj
    : null;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>GridWeaver Microgrid Control Tower</h1>
          <p className="subtitle">Real-time Maharashtra Household Energy Matrix</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button
            className="theme-toggle-btn"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? "☀️ Light" : "🌙 Dark"}
          </button>

          <div className={`status-badge ${connected ? "online" : "offline"}`}>
            {connected ? "● LIVE STREAM CONNECTED" : "○ DISCONNECTED"}
          </div>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Net Grid Balance</h3>
          <p className="stat-value" style={{ color: gridSummary && gridSummary.netGridBalanceKw >= 0 ? '#10b981' : '#ef4444' }}>
            {gridSummary ? `${gridSummary.netGridBalanceKw.toFixed(1)} kW` : 'Loading...'}
          </p>
        </div>
        <div className="stat-card">
          <h3>Total Solar Generation</h3>
          <p className="stat-value watts">
            {gridSummary ? `${gridSummary.totalSolarGenerationKw.toFixed(1)} kW` : `${totalSolarWatts.toFixed(1)} W`}
          </p>
        </div>
        <div className="stat-card">
          <h3>Total Battery Demand</h3>
          <p className="stat-value battery">
            {gridSummary ? `${gridSummary.totalBatteryDemandKw.toFixed(1)} kW` : `${totalBatteryWatts.toFixed(1)} W`}
          </p>
        </div>
        <div className="stat-card">
          <h3>Avg Battery Level</h3>
          <p className="stat-value">
            {gridSummary ? `${gridSummary.averageBatterySocPercentage.toFixed(1)}%` : 'Loading...'}
          </p>
        </div>
      </div>

      <section
        style={{
          position: "relative",
          margin: "24px 0",
          padding: "16px",
          background: isDarkMode ? "#1e293b" : "#ffffff",
          border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
          borderRadius: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            marginBottom: "14px",
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Maharashtra GIS Device Map</h2>
            <p style={{ margin: "6px 0 0", color: "#64748b" }}>
              {liveTelemetry.length > 0
                ? "Showing live telemetry from the backend"
                : "Showing static Week 1 preview data"}
            </p>
          </div>
          <strong style={{ color: connected ? "#10b981" : "#64748b" }}>
            {mapTelemetry.length} devices
          </strong>
        </div>

        {/* Map Container Wrapper with Decoupled Floating Card Overlay */}
        <div style={{ position: "relative", width: "100%", height: "580px" }}>
          <GridMap
            telemetry={mapTelemetry}
            onDeviceSelect={(device) => setSelectedDeviceObj(device)}
          />

          {/* Bulletproof Floating Details Card */}
          {activeSelectedDevice && (
            <div
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                zIndex: 3000,
                minWidth: "260px",
                background: isDarkMode ? "#0f172a" : "#ffffff",
                color: isDarkMode ? "#f8fafc" : "#0f172a",
                border: `1px solid ${isDarkMode ? "#334155" : "#cbd5e1"}`,
                borderRadius: "10px",
                padding: "16px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                fontFamily: "Arial, sans-serif",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <strong style={{ fontFamily: "monospace", fontSize: "14px" }}>
                  {activeSelectedDevice.deviceId}
                </strong>
                <button
                  onClick={() => setSelectedDeviceObj(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "inherit",
                    cursor: "pointer",
                    fontSize: "16px",
                    fontWeight: "bold",
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ fontSize: "13px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px" }}>
                <span style={{ color: "#64748b" }}>Status:</span>
                <span style={{ fontWeight: 700, color: statusColors[activeSelectedDevice.status] || "#06b6d4" }}>
                  {activeSelectedDevice.status}
                </span>

                <span style={{ color: "#64748b" }}>Output:</span>
                <span>{(Number(activeSelectedDevice.outputWatts || 0) / 1000).toFixed(1)} kW</span>

                <span style={{ color: "#64748b" }}>Battery:</span>
                <span>{Number(activeSelectedDevice.batteryLevelPct || 0).toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}