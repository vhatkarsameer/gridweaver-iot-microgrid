import React, { useEffect, useState, useRef } from "react";
import { Client } from "@stomp/stompjs";
import "./App.css";
import GridMap from "./components/GridMap.jsx";
import Week4EventLog from "./components/Week4EventLog.jsx";
import Week4PowerFlow from "./components/Week4PowerFlow.jsx";

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
  const [showWeek4Dashboard, setShowWeek4Dashboard] = useState(false);

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
    }, 2500);

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
    if (searchInputRef.current) searchInputRef.current.value = "";
  };

  // --- Tesla-Inspired UI Variables ---
  // Darker, smoother glass with stronger blur and almost invisible borders
  const panelBg = isDarkMode ? "rgba(0, 0, 0, 0.65)" : "rgba(255, 255, 255, 0.85)";
  const panelBorder = isDarkMode ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.05)";
  const textColor = isDarkMode ? "#ffffff" : "#000000";
  const secondaryText = isDarkMode ? "#a1a1aa" : "#71717a";
  const blurEffect = "blur(20px)"; // Premium frosted acrylic look

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative", overflow: "hidden", background: isDarkMode ? "#000000" : "#f4f4f5", fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* BASE LAYER: FULL SCREEN MAP */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
        <GridMap
          households={households}
          onHouseSelect={(id) => setSelectedHouseId(id)}
          activeHouse={activeSelectedHouse}
        />
      </div>

      {/* OVERLAY LAYER: UI PANELS */}
      <div style={{ position: "absolute", inset: 0, zIndex: 2000, pointerEvents: "none" }}>

        {/* Top Header */}
        <div
          style={{
            position: "absolute",
            top: "24px",
            left: "80px",
            pointerEvents: "auto",
            background: panelBg,
            backdropFilter: blurEffect,
            border: panelBorder,
            padding: "12px 24px",
            borderRadius: "20px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)"
          }}
        >
          <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "600", letterSpacing: "-0.5px", color: textColor }}>
            GridWeaver
          </h1>
          <p style={{ margin: "2px 0 0", color: secondaryText, fontSize: "12px", fontWeight: "600", letterSpacing: "0.5px", textTransform: "uppercase" }}>
            Maharashtra Energy Matrix
          </p>
        </div>

        {/* Search Bar (Sleek pill design) */}
        <div style={{ position: "absolute", top: "24px", left: "50%", transform: "translateX(-50%)", pointerEvents: "auto" }}>
          <form onSubmit={handleSearch} style={{ background: panelBg, backdropFilter: blurEffect, borderRadius: "30px", border: panelBorder, padding: "4px 8px", width: "400px", display: "flex", alignItems: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}>
            <span style={{ paddingLeft: "12px", color: secondaryText }}>🔍</span>
            <input
              type="text"
              placeholder="Search House ID..."
              ref={searchInputRef}
              style={{ border: "none", background: "transparent", color: textColor, width: "100%", padding: "12px", outline: "none", fontSize: "15px", fontWeight: "500" }}
            />
            <button type="button" onClick={clearSearch} style={{ background: "rgba(161, 161, 170, 0.2)", borderRadius: "50%", width: "28px", height: "28px", border: "none", color: textColor, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginRight: "4px" }}>✕</button>
          </form>
        </div>

        {/* Top Controls Island */}
        <div style={{ position: "absolute", top: "24px", right: "24px", display: "flex", gap: "12px", alignItems: "center", pointerEvents: "auto" }}>
          <button onClick={() => setShowWeek4Dashboard(!showWeek4Dashboard)} style={{ background: showWeek4Dashboard ? "#2563eb" : panelBg, backdropFilter: blurEffect, border: panelBorder, color: showWeek4Dashboard ? "#ffffff" : textColor, padding: "10px 16px", borderRadius: "20px", cursor: "pointer", fontWeight: "600", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            {showWeek4Dashboard ? "Close Week 4" : "Week 4 dashboard"}
          </button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} style={{ background: panelBg, backdropFilter: blurEffect, border: panelBorder, color: textColor, padding: "10px 16px", borderRadius: "20px", cursor: "pointer", fontWeight: "600", fontSize: "13px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
            {isDarkMode ? "Light" : "Dark"}
          </button>
          <div style={{ background: panelBg, backdropFilter: blurEffect, border: panelBorder, padding: "10px 16px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", color: connected ? "#10b981" : "#ef4444", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: connected ? "#10b981" : "#ef4444", boxShadow: `0 0 8px ${connected ? "#10b981" : "#ef4444"}` }}></div>
            {connected ? "LIVE" : "OFFLINE"}
          </div>
        </div>

        {/* WEEK 4 FRONTEND DRAWER: additive integration; existing map and telemetry remain underneath */}
        {showWeek4Dashboard && (
          <div style={{ position: "absolute", top: "92px", right: "24px", bottom: "118px", width: "min(440px, calc(100vw - 48px))", overflowY: "auto", display: "grid", alignContent: "start", gap: "14px", pointerEvents: "auto", borderRadius: "14px" }}>
            <Week4PowerFlow />
            <Week4EventLog />
          </div>
        )}

        {/* Selected House Details Floating Card */}
        {activeSelectedHouse && !showWeek4Dashboard && (
          <div style={{ position: "absolute", top: "100px", right: "24px", width: "320px", background: panelBg, backdropFilter: blurEffect, color: textColor, border: panelBorder, borderRadius: "16px", padding: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)", pointerEvents: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div>
                <strong style={{ fontSize: "18px", fontWeight: "600", display: "block" }}>{activeSelectedHouse.houseId}</strong>
                <span style={{ fontSize: "12px", color: secondaryText, fontFamily: "monospace", letterSpacing: "0.5px" }}>{activeSelectedHouse.latitude.toFixed(4)}, {activeSelectedHouse.longitude.toFixed(4)}</span>
              </div>
              <button onClick={() => setSelectedHouseId(null)} style={{ background: "none", border: "none", color: secondaryText, cursor: "pointer", fontSize: "20px" }}>✕</button>
            </div>

            {/* Solar Data */}
            <div style={{ marginBottom: "24px" }}>
              <div style={{ fontSize: "11px", color: secondaryText, fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>Solar Array</div>
              {activeSelectedHouse.solar ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: secondaryText, marginBottom: "4px" }}>Status</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: statusColors[activeSelectedHouse.solar.status] }}>{activeSelectedHouse.solar.status}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: secondaryText, marginBottom: "4px" }}>Output</div>
                    <div style={{ fontSize: "18px", fontWeight: "600" }}>{(activeSelectedHouse.solar.outputWatts / 1000).toFixed(2)} <span style={{ fontSize: "12px", color: secondaryText }}>kW</span></div>
                  </div>
                </div>
              ) : ( <div style={{ fontSize: "13px", color: secondaryText }}>Awaiting Telemetry...</div> )}
            </div>

            {/* Battery Data */}
            <div>
              <div style={{ fontSize: "11px", color: secondaryText, fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase", marginBottom: "12px" }}>Powerwall Storage</div>
              {activeSelectedHouse.battery ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <div style={{ fontSize: "12px", color: secondaryText, marginBottom: "4px" }}>Status</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, color: statusColors[activeSelectedHouse.battery.status] }}>{activeSelectedHouse.battery.status}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: secondaryText, marginBottom: "4px" }}>Flow</div>
                    <div style={{ fontSize: "18px", fontWeight: "600" }}>{(activeSelectedHouse.battery.outputWatts / 1000).toFixed(2)} <span style={{ fontSize: "12px", color: secondaryText }}>kW</span></div>
                  </div>
                  <div>
                    <div style={{ fontSize: "12px", color: secondaryText, marginBottom: "4px" }}>Charge Level</div>
                    <div style={{ fontSize: "18px", fontWeight: "600" }}>{activeSelectedHouse.battery.batteryLevelPct.toFixed(1)}<span style={{ fontSize: "12px", color: secondaryText }}>%</span></div>
                  </div>
                </div>
              ) : ( <div style={{ fontSize: "13px", color: secondaryText }}>Awaiting Telemetry...</div> )}
            </div>
          </div>
        )}

        {/* Unified Bottom Dashboard Dock */}
        <div style={{ position: "absolute", bottom: "32px", left: "50%", transform: "translateX(-50%)", pointerEvents: "auto", display: "flex", gap: "40px", background: panelBg, backdropFilter: blurEffect, border: panelBorder, padding: "20px 48px", borderRadius: "24px", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>

          <div style={{ minWidth: "120px" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "11px", color: secondaryText, fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase" }}>Net Grid Balance</h3>
            <div style={{ fontSize: "28px", fontWeight: "600", color: gridSummary?.netGridBalanceKw >= 0 ? '#10b981' : '#ef4444', letterSpacing: "-1px" }}>
              {gridSummary ? `${gridSummary.netGridBalanceKw.toFixed(1)}` : '...'} <span style={{ fontSize: "16px", fontWeight: "500", color: secondaryText }}>kW</span>
            </div>
          </div>

          <div style={{ width: "1px", background: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}></div>

          <div style={{ minWidth: "120px" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "11px", color: secondaryText, fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase" }}>Total Solar</h3>
            <div style={{ fontSize: "28px", fontWeight: "600", color: textColor, letterSpacing: "-1px" }}>
              {gridSummary ? `${gridSummary.totalSolarGenerationKw.toFixed(1)}` : `${(totalSolarWatts/1000).toFixed(1)}`} <span style={{ fontSize: "16px", fontWeight: "500", color: secondaryText }}>kW</span>
            </div>
          </div>

          <div style={{ width: "1px", background: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}></div>

          <div style={{ minWidth: "120px" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "11px", color: secondaryText, fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase" }}>Total Battery</h3>
            <div style={{ fontSize: "28px", fontWeight: "600", color: textColor, letterSpacing: "-1px" }}>
              {gridSummary ? `${gridSummary.totalBatteryDemandKw.toFixed(1)}` : `${(totalBatteryWatts/1000).toFixed(1)}`} <span style={{ fontSize: "16px", fontWeight: "500", color: secondaryText }}>kW</span>
            </div>
          </div>

          <div style={{ width: "1px", background: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}></div>

          <div style={{ minWidth: "120px" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "11px", color: secondaryText, fontWeight: "700", letterSpacing: "1px", textTransform: "uppercase" }}>Avg Capacity</h3>
            <div style={{ fontSize: "28px", fontWeight: "600", color: textColor, letterSpacing: "-1px" }}>
              {gridSummary ? `${gridSummary.averageBatterySocPercentage.toFixed(1)}` : '...'} <span style={{ fontSize: "16px", fontWeight: "500", color: secondaryText }}>%</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

