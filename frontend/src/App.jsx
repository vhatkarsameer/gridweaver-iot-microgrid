import React, { useEffect, useState, useRef, useMemo } from "react";
import { Client } from "@stomp/stompjs";
import "./App.css";
import GridMap from "./components/GridMap.jsx";
import EventLog from "./components/EventLog.jsx";
import PowerFlow from "./components/PowerFlow.jsx";
import "./components/dashboard.css";

function telemetryEvent(payload, previousStatus) {
  const deviceId = payload.deviceId || "unknown-device";
  const houseId = deviceId.replace("SOLAR-", "").replace("BATT-", "");
  const status = String(payload.status || "UNKNOWN").toUpperCase();
  const changed = previousStatus && previousStatus !== status;
  return {
    id: `${deviceId}-${payload.timestamp || Date.now()}-${Math.random()}`,
    time: payload.timestamp ? new Date(payload.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
    type: changed ? "STATE CHANGE" : "TELEMETRY",
    region: houseId,
    deviceId,
    deviceType: payload.deviceType || "UNKNOWN",
    message: changed ? `${deviceId} changed from ${previousStatus} to ${status}` : `${deviceId} reported ${status}`,
    status: status === "FAULT" ? "warning" : changed ? "info" : "success",
  };
}

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
  const [showDashboard, setShowDashboard] = useState(false);
  const [liveEvents, setLiveEvents] = useState([]);
  const searchInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("app-theme", isDarkMode ? "dark" : "light");
    document.body.classList.toggle("dark-mode", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    let messageBuffer = [];
    const lastStatuses = new Map();

    const client = new Client({
      brokerURL: import.meta.env.VITE_TELEMETRY_WS_URL || "ws://localhost:8080/ws-grid",
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true);
        client.subscribe("/topic/telemetry", (message) => {
          if (!message.body) return;
          try {
            const payload = JSON.parse(message.body);
            const previousStatus = lastStatuses.get(payload.deviceId);
            const nextStatus = String(payload.status || "UNKNOWN").toUpperCase();
            if (!previousStatus || previousStatus !== nextStatus) {
              setLiveEvents((previous) => [telemetryEvent(payload, previousStatus), ...previous].slice(0, 60));
            }
            lastStatuses.set(payload.deviceId, nextStatus);
            messageBuffer.push(payload);
          } catch (error) {
            console.error("Invalid telemetry message:", error);
          }
        });

        client.subscribe("/topic/grid-state", (message) => {
          if (!message.body) return;
          try {
            setGridSummary(JSON.parse(message.body));
          } catch (error) {
            console.error("Invalid grid-state message:", error);
          }
        });
      },
      onWebSocketClose: () => setConnected(false),
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
      onWebSocketError: () => setConnected(false),
    });

    client.activate();

    // 1-second batching flush to prevent React DOM lag
    const flushInterval = setInterval(() => {
      if (messageBuffer.length === 0) return;
      const currentBatch = [...messageBuffer];
      messageBuffer = [];

      setHouseholdMap((previousMap) => {
        const updatedMap = { ...previousMap };
        currentBatch.forEach((payload) => {
          if (!payload?.deviceId) return;
          const houseId = payload.deviceId.replace("SOLAR-", "").replace("BATT-", "");
          if (!updatedMap[houseId]) {
            updatedMap[houseId] = {
              houseId,
              latitude: Number(payload.latitude),
              longitude: Number(payload.longitude),
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

  const households = useMemo(() => Object.values(householdMap), [householdMap]);

  const totalSolarWatts = useMemo(
    () => households.reduce((sum, h) => sum + (h.solar?.outputWatts || 0), 0),
    [households]
  );
  const totalBatteryWatts = useMemo(
    () => households.reduce((sum, h) => sum + (h.battery?.outputWatts || 0), 0),
    [households]
  );

  const activeSelectedHouse = selectedHouseId ? householdMap[selectedHouseId] : null;

  const handleSearch = (e) => {
    e.preventDefault();
    const term = searchInputRef.current?.value?.trim().toUpperCase();
    if (!term) return;
    const foundHouse = households.find(
      (h) => h.houseId.toUpperCase() === term || h.houseId.toUpperCase().includes(term)
    );
    if (foundHouse) {
      setSelectedHouseId(foundHouse.houseId);
    } else {
      alert(`House "${term}" not found in current telemetry.`);
    }
  };

  const panelBg = isDarkMode ? "rgba(15, 23, 42, 0.75)" : "rgba(255, 255, 255, 0.88)";
  const panelBorder = isDarkMode ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)";
  const textColor = isDarkMode ? "#ffffff" : "#0f172a";
  const secondaryText = isDarkMode ? "#94a3b8" : "#64748b";
  const blurEffect = "blur(16px)";

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", background: isDarkMode ? "#020617" : "#f8fafc" }}>
      {/* Base Map Layer */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        <GridMap
          households={households}
          onHouseSelect={(id) => setSelectedHouseId(id)}
          activeHouse={activeSelectedHouse}
        />
      </div>

      {/* Floating HUD Overlays */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2000, pointerEvents: "none" }}>
        {/* Top Header */}
        <div
          style={{
            position: "absolute",
            top: "20px",
            left: "24px",
            pointerEvents: "auto",
            background: panelBg,
            backdropFilter: blurEffect,
            border: panelBorder,
            padding: "10px 20px",
            borderRadius: "16px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: textColor }}>GridWeaver</h1>
          <p style={{ margin: "2px 0 0", color: secondaryText, fontSize: "11px", fontWeight: "700", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Maharashtra Microgrid Matrix
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ position: "absolute", top: "20px", left: "50%", transform: "translateX(-50%)", pointerEvents: "auto" }}>
          <form onSubmit={handleSearch} style={{ background: panelBg, backdropFilter: blurEffect, borderRadius: "30px", border: panelBorder, padding: "4px 8px", width: "360px", display: "flex", alignItems: "center", boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}>
            <input
              type="text"
              placeholder="Search House ID (e.g. HOUSE-MH-1001)..."
              ref={searchInputRef}
              style={{ border: "none", background: "transparent", color: textColor, width: "100%", padding: "10px 14px", outline: "none", fontSize: "14px", fontWeight: "500" }}
            />
            <button type="button" onClick={() => { if (searchInputRef.current) searchInputRef.current.value = ""; }} style={{ background: "rgba(148, 163, 184, 0.2)", borderRadius: "50%", width: "26px", height: "26px", border: "none", color: textColor, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "4px" }}>
              ✕
            </button>
          </form>
        </div>

        {/* Top Controls */}
        <div style={{ position: "absolute", top: "20px", right: "24px", display: "flex", gap: "10px", alignItems: "center", pointerEvents: "auto" }}>
          <button onClick={() => setShowDashboard((value) => !value)} style={{ background: showDashboard ? "#2563eb" : panelBg, backdropFilter: blurEffect, border: panelBorder, color: showDashboard ? "#ffffff" : textColor, padding: "8px 14px", borderRadius: "16px", cursor: "pointer", fontWeight: "600", fontSize: "12px" }}>
            {showDashboard ? "Close dashboard" : "Week 4 dashboard"}
          </button>
          <button onClick={() => setIsDarkMode((d) => !d)} style={{ background: panelBg, backdropFilter: blurEffect, border: panelBorder, color: textColor, padding: "8px 14px", borderRadius: "16px", cursor: "pointer", fontWeight: "600", fontSize: "12px" }}>
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </button>
          <div style={{ background: panelBg, backdropFilter: blurEffect, border: panelBorder, padding: "8px 14px", borderRadius: "16px", fontSize: "12px", fontWeight: "700", color: connected ? "#10b981" : "#ef4444", display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: connected ? "#10b981" : "#ef4444" }} />
            {connected ? "LIVE" : "OFFLINE"}
          </div>
        </div>

        {showDashboard && (
          <div className="week4-dashboard-drawer" role="region" aria-label="Week 4 live dashboard">
            <PowerFlow gridSummary={gridSummary} households={households} />
            <EventLog events={liveEvents} />
          </div>
        )}

        {/* Selected House Card */}
        {activeSelectedHouse && (
          <div style={{ position: "absolute", top: "80px", right: "24px", width: "300px", background: panelBg, backdropFilter: blurEffect, color: textColor, border: panelBorder, borderRadius: "16px", padding: "20px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", pointerEvents: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <strong style={{ fontSize: "16px", fontWeight: "700", display: "block" }}>{activeSelectedHouse.houseId}</strong>
                <span style={{ fontSize: "11px", color: secondaryText, fontFamily: "monospace" }}>
                  {activeSelectedHouse.latitude.toFixed(4)}, {activeSelectedHouse.longitude.toFixed(4)}
                </span>
              </div>
              <button onClick={() => setSelectedHouseId(null)} style={{ background: "none", border: "none", color: secondaryText, cursor: "pointer", fontSize: "16px" }}>✕</button>
            </div>
            {/* Solar Info */}
            <div style={{ marginBottom: "14px" }}>
              <div style={{ fontSize: "10px", color: secondaryText, fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>Solar Array</div>
              {activeSelectedHouse.solar ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: secondaryText }}>Status</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: statusColors[activeSelectedHouse.solar.status] || textColor }}>{activeSelectedHouse.solar.status}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: secondaryText }}>Output</div>
                    <div style={{ fontSize: "15px", fontWeight: 700 }}>{(activeSelectedHouse.solar.outputWatts / 1000).toFixed(2)} kW</div>
                  </div>
                </div>
              ) : <div style={{ fontSize: "12px", color: secondaryText }}>Awaiting Telemetry...</div>}
            </div>
            {/* Battery Info */}
            <div>
              <div style={{ fontSize: "10px", color: secondaryText, fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "6px" }}>Storage Battery</div>
              {activeSelectedHouse.battery ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  <div>
                    <div style={{ fontSize: "11px", color: secondaryText }}>Status</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: statusColors[activeSelectedHouse.battery.status] || textColor }}>{activeSelectedHouse.battery.status}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: secondaryText }}>Draw</div>
                    <div style={{ fontSize: "14px", fontWeight: 700 }}>{(activeSelectedHouse.battery.outputWatts / 1000).toFixed(2)} kW</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "11px", color: secondaryText }}>Charge</div>
                    <div style={{ fontSize: "14px", fontWeight: 700 }}>{activeSelectedHouse.battery.batteryLevelPct.toFixed(0)}%</div>
                  </div>
                </div>
              ) : <div style={{ fontSize: "12px", color: secondaryText }}>Awaiting Telemetry...</div>}
            </div>
          </div>
        )}

        {/* Bottom Metrics Dock */}
        <div style={{ position: "absolute", bottom: "24px", left: "50%", transform: "translateX(-50%)", pointerEvents: "auto", display: "flex", gap: "32px", background: panelBg, backdropFilter: blurEffect, border: panelBorder, padding: "14px 36px", borderRadius: "20px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
          <div style={{ minWidth: "110px", textAlign: "center" }}>
            <h3 style={{ margin: "0 0 2px 0", fontSize: "10px", color: secondaryText, fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase" }}>Net Balance</h3>
            <div style={{ fontSize: "22px", fontWeight: "700", color: (gridSummary?.netGridBalanceKw ?? (totalSolarWatts - totalBatteryWatts)) >= 0 ? "#10b981" : "#ef4444" }}>
              {gridSummary ? gridSummary.netGridBalanceKw.toFixed(1) : ((totalSolarWatts - totalBatteryWatts) / 1000).toFixed(1)} kW
            </div>
          </div>
          <div style={{ width: "1px", background: panelBorder }} />
          <div style={{ minWidth: "110px", textAlign: "center" }}>
            <h3 style={{ margin: "0 0 2px 0", fontSize: "10px", color: secondaryText, fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase" }}>Total Solar</h3>
            <div style={{ fontSize: "22px", fontWeight: "700", color: textColor }}>
              {gridSummary ? gridSummary.totalSolarGenerationKw.toFixed(1) : (totalSolarWatts / 1000).toFixed(1)} kW
            </div>
          </div>
          <div style={{ width: "1px", background: panelBorder }} />
          <div style={{ minWidth: "110px", textAlign: "center" }}>
            <h3 style={{ margin: "0 0 2px 0", fontSize: "10px", color: secondaryText, fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase" }}>Total Battery</h3>
            <div style={{ fontSize: "22px", fontWeight: "700", color: textColor }}>
              {gridSummary ? gridSummary.totalBatteryDemandKw.toFixed(1) : (totalBatteryWatts / 1000).toFixed(1)} kW
            </div>
          </div>
          <div style={{ width: "1px", background: panelBorder }} />
          <div style={{ minWidth: "110px", textAlign: "center" }}>
            <h3 style={{ margin: "0 0 2px 0", fontSize: "10px", color: secondaryText, fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase" }}>Avg Charge</h3>
            <div style={{ fontSize: "22px", fontWeight: "700", color: textColor }}>
              {gridSummary ? `${gridSummary.averageBatterySocPercentage.toFixed(1)}%` : "..."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}