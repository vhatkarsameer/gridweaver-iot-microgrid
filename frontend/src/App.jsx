import React, { useEffect, useState, useRef } from "react";
import { Client } from "@stomp/stompjs";
import "./App.css";
import GridMap from "./components/GridMap.jsx";

const statusColors = {
  IDLE: "#64748b",
  CHARGING: "#06b6d4",
  DISCHARGING: "#f59e0b",
  GENERATING: "#10b981",
  FAULT: "#ef4444",
};

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem("app-theme") === "dark");
  const [householdMap, setHouseholdMap] = useState({});
  const [connected, setConnected] = useState(false);
  const [gridSummary, setGridSummary] = useState(null);

  const [selectedHouseId, setSelectedHouseId] = useState(null);

  // Use a ref instead of state to prevent typing lag
  const searchInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("app-theme", isDarkMode ? "dark" : "light");
    document.body.classList.toggle("dark-mode", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    let messageBuffer = [];

    const client = new Client({
      brokerURL: "ws://localhost:8080/ws-grid",
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true);

        client.subscribe("/topic/telemetry", (message) => {
          if (!message.body) return;
          messageBuffer.push(JSON.parse(message.body));
        });

        client.subscribe("/topic/grid-state", (message) => {
          if (!message.body) return;
          setGridSummary(JSON.parse(message.body));
        });
      },
      onWebSocketClose: () => setConnected(false),
      onDisconnect: () => setConnected(false),
    });

    client.activate();

    const flushInterval = setInterval(() => {
      if (messageBuffer.length === 0) return;

      const currentBatch = [...messageBuffer];
      messageBuffer = [];

      setHouseholdMap((previousMap) => {
        const updatedMap = { ...previousMap };

        currentBatch.forEach((payload) => {
          const houseId = payload.deviceId.replace("SOLAR-", "").replace("BATT-", "");

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
    }, 1000);

    return () => {
      clearInterval(flushInterval);
      client.deactivate();
    };
  }, []);

  const households = Object.values(householdMap);
  const totalSolarWatts = households.reduce((sum, h) => sum + (h.solar?.outputWatts || 0), 0);
  const totalBatteryWatts = households.reduce((sum, h) => sum + (h.battery?.outputWatts || 0), 0);

  const activeSelectedHouse = selectedHouseId ? householdMap[selectedHouseId] : null;

  const handleSearch = (e) => {
    e.preventDefault();
    const term = searchInputRef.current?.value?.trim().toUpperCase();
    if (!term) return;

    const foundHouse = households.find(h =>
      h.houseId.toUpperCase() === term || h.houseId.toUpperCase().includes(term)
    );

    if (foundHouse) {
      setSelectedHouseId(foundHouse.houseId);
    } else {
      alert(`House "${term}" not found in current telemetry stream.`);
    }
  };

  const clearSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.value = "";
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>GridWeaver Microgrid Control Tower</h1>
          <p className="subtitle">Real-time Maharashtra Household Energy Matrix</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button className="theme-toggle-btn" onClick={() => setIsDarkMode(!isDarkMode)}>
            {isDarkMode ? "☀️ Light" : "🌙 Dark"}
          </button>
          <div className={`status-badge ${connected ? "online" : "offline"}`}>
            {connected ? "🟢 LIVE STREAM CONNECTED" : "⚪ DISCONNECTED"}
          </div>
        </div>
      </header>

      <div className="control-bar">
        <form className="search-box" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search House ID (e.g., 1500)..."
            ref={searchInputRef}
          />
          <button type="button" className="clear-btn" onClick={clearSearch}>✕</button>
        </form>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Net Grid Balance</h3>
          <p className="stat-value" style={{ color: gridSummary?.netGridBalanceKw >= 0 ? '#10b981' : '#ef4444' }}>
            {gridSummary ? `${gridSummary.netGridBalanceKw.toFixed(1)} kW` : 'Loading...'}
          </p>
        </div>
        <div className="stat-card">
          <h3>Total Solar Generation</h3>
          <p className="stat-value watts">
            {gridSummary ? `${gridSummary.totalSolarGenerationKw.toFixed(1)} kW` : `${(totalSolarWatts/1000).toFixed(1)} kW`}
          </p>
        </div>
        <div className="stat-card">
          <h3>Total Battery Demand</h3>
          <p className="stat-value battery">
            {gridSummary ? `${gridSummary.totalBatteryDemandKw.toFixed(1)} kW` : `${(totalBatteryWatts/1000).toFixed(1)} kW`}
          </p>
        </div>
        <div className="stat-card">
          <h3>Avg Battery Level</h3>
          <p className="stat-value">
            {gridSummary ? `${gridSummary.averageBatterySocPercentage.toFixed(1)}%` : 'Loading...'}
          </p>
        </div>
      </div>

      <section style={{ position: "relative", margin: "24px 0", padding: "16px", background: isDarkMode ? "#1e293b" : "#ffffff", border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`, borderRadius: "12px" }}>

        <div style={{ position: "relative", width: "100%", height: "580px" }}>

          <GridMap
            households={households}
            onHouseSelect={(id) => setSelectedHouseId(id)}
            activeHouse={activeSelectedHouse}
          />

          {activeSelectedHouse && (
            <div
              style={{
                position: "absolute",
                top: "16px",
                right: "16px",
                zIndex: 3000,
                minWidth: "280px",
                background: isDarkMode ? "#0f172a" : "#ffffff",
                color: isDarkMode ? "#f8fafc" : "#0f172a",
                border: `1px solid ${isDarkMode ? "#334155" : "#cbd5e1"}`,
                borderRadius: "10px",
                padding: "16px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
                fontFamily: "Arial, sans-serif",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`, paddingBottom: "8px", marginBottom: "12px" }}>
                <strong style={{ fontFamily: "monospace", fontSize: "14px" }}>
                  🏠 {activeSelectedHouse.houseId}
                </strong>
                <button
                  onClick={() => setSelectedHouseId(null)}
                  style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}
                >
                  ✕
                </button>
              </div>

              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}>Solar Array</div>
                {activeSelectedHouse.solar ? (
                  <div style={{ fontSize: "13px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 10px" }}>
                    <span style={{ color: "#64748b" }}>Status:</span>
                    <span style={{ fontWeight: 700, color: statusColors[activeSelectedHouse.solar.status] }}>{activeSelectedHouse.solar.status}</span>
                    <span style={{ color: "#64748b" }}>Output:</span>
                    <span style={{ fontFamily: "monospace" }}>{(activeSelectedHouse.solar.outputWatts / 1000).toFixed(2)} kW</span>
                  </div>
                ) : (
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>Awaiting Telemetry...</div>
                )}
              </div>

              <div>
                <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}>Battery Storage</div>
                {activeSelectedHouse.battery ? (
                  <div style={{ fontSize: "13px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 10px" }}>
                    <span style={{ color: "#64748b" }}>Status:</span>
                    <span style={{ fontWeight: 700, color: statusColors[activeSelectedHouse.battery.status] }}>{activeSelectedHouse.battery.status}</span>
                    <span style={{ color: "#64748b" }}>Draw/Charge:</span>
                    <span style={{ fontFamily: "monospace" }}>{(activeSelectedHouse.battery.outputWatts / 1000).toFixed(2)} kW</span>
                    <span style={{ color: "#64748b" }}>Charge Level:</span>
                    <span style={{ fontFamily: "monospace" }}>{activeSelectedHouse.battery.batteryLevelPct.toFixed(1)}%</span>
                  </div>
                ) : (
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>Awaiting Telemetry...</div>
                )}
              </div>

            </div>
          )}
        </div>
      </section>
    </div>
  );
}
