import React, { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import "./App.css";

import GridMap from "./components/GridMap.jsx";
import { mockTelemetry } from "./data/mockTelemetry.js";

const BROKER_URL = "ws://localhost:8080/ws-grid";
const TELEMETRY_TOPIC = "/topic/telemetry";
const THEME_STORAGE_KEY = "gridweaver-theme";

function App() {
  const [householdMap, setHouseholdMap] = useState({});
  const [connected, setConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem(THEME_STORAGE_KEY) === "dark";
  });

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    const client = new Client({
      brokerURL: BROKER_URL,
      reconnectDelay: 3000,

      onConnect: () => {
        setConnected(true);

        client.subscribe(TELEMETRY_TOPIC, (message) => {
          if (!message.body) return;

          try {
            const payload = JSON.parse(message.body);
            const deviceId = String(payload.deviceId || "");
            const houseId = deviceId
              .replace("SOLAR-", "")
              .replace("BATT-", "");

            if (!houseId) return;

            setHouseholdMap((previousMap) => {
              const currentHouse = previousMap[houseId] || {
                houseId,
                latitude: Number(payload.latitude) || 19.7515,
                longitude: Number(payload.longitude) || 75.7139,
                solar: null,
                battery: null,
              };

              const updatedHouse = {
                ...currentHouse,
                latitude: Number(payload.latitude) || currentHouse.latitude,
                longitude: Number(payload.longitude) || currentHouse.longitude,
              };

              if (payload.deviceType === "SOLAR_PANEL") {
                updatedHouse.solar = payload;
              } else if (payload.deviceType === "BATTERY") {
                updatedHouse.battery = payload;
              }

              return {
                ...previousMap,
                [houseId]: updatedHouse,
              };
            });
          } catch (error) {
            console.error("Unable to parse telemetry message:", error);
          }
        });
      },

      onWebSocketClose: () => setConnected(false),
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);

  const households = Object.values(householdMap);

  const totalSolarWatts = households.reduce(
    (sum, house) => sum + Number(house.solar?.outputWatts || 0),
    0,
  );

  const totalBatteryWatts = households.reduce(
    (sum, house) => sum + Number(house.battery?.outputWatts || 0),
    0,
  );

  const batteryReadings = households
    .map((house) => house.battery?.batteryLevelPct)
    .filter((value) => Number.isFinite(Number(value)));

  const averageBatteryLevel = batteryReadings.length
    ? batteryReadings.reduce((sum, value) => sum + Number(value), 0) /
      batteryReadings.length
    : 0;

  const netGridBalance = totalSolarWatts - totalBatteryWatts;

  const liveTelemetry = households.flatMap((house) =>
    [house.solar, house.battery].filter(Boolean),
  );

  const mapTelemetry = liveTelemetry.length > 0 ? liveTelemetry : mockTelemetry;

  const filteredHouseholds = households.filter((house) => {
    const query = searchTerm.toLowerCase().trim();
    const fullSolarId = `solar-${house.houseId}`.toLowerCase();
    const fullBatteryId = `batt-${house.houseId}`.toLowerCase();
    const cleanHouseId = house.houseId.toLowerCase();

    const matchesSearch =
      cleanHouseId.includes(query) ||
      fullSolarId.includes(query) ||
      fullBatteryId.includes(query);

    if (filterType === "SOLAR") {
      return matchesSearch && house.solar !== null;
    }

    if (filterType === "BATTERY") {
      return matchesSearch && house.battery !== null;
    }

    return matchesSearch;
  });

  return (
    <div className={`dashboard-container ${isDark ? "dark" : ""}`}>
      <header className="dashboard-header">
        <div>
          <h1>GridWeaver Microgrid Control Tower</h1>
          <p className="subtitle">
            Real-time Maharashtra Household Energy Matrix
          </p>
        </div>

        <div className="header-actions">
          <div className={`status-badge ${connected ? "online" : "offline"}`}>
            {connected ? "● LIVE STREAM CONNECTED" : "○ DISCONNECTED"}
          </div>

          <button
            type="button"
            className="theme-toggle"
            onClick={() => setIsDark((current) => !current)}
            aria-label="Toggle dark theme"
          >
            {isDark ? "Light mode" : "Dark mode"}
          </button>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Net Grid Balance</h3>
          <p className="stat-value">{netGridBalance.toFixed(1)} W</p>
        </div>
        <div className="stat-card">
          <h3>Total Solar Generation</h3>
          <p className="stat-value watts">{totalSolarWatts.toFixed(1)} W</p>
        </div>
        <div className="stat-card">
          <h3>Avg Battery Level</h3>
          <p className="stat-value battery">
            {averageBatteryLevel.toFixed(1)}%
          </p>
        </div>
      </div>

      <section className="map-section">
        <div className="map-section-header">
          <div>
            <h2>Maharashtra GIS Device Map</h2>
            <p>
              {liveTelemetry.length > 0
                ? "Showing live telemetry from the backend"
                : "Showing static Week 1 preview data"}
            </p>
          </div>
          <strong>{mapTelemetry.length} devices</strong>
        </div>

        <GridMap telemetry={mapTelemetry} />
      </section>

      <div className="control-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by House ID, Solar ID, or Battery ID..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => setSearchTerm("")}
            >
              ✕
            </button>
          )}
        </div>

        <div className="filter-group">
          {[
            ["ALL", "All Households"],
            ["SOLAR", "Solar Active"],
            ["BATTERY", "Battery Active"],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              className={`filter-btn ${filterType === value ? "active" : ""}`}
              onClick={() => setFilterType(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="feed-section">
        <h2>
          Maharashtra Microgrid Households
          <span className="count-badge">
            Showing {filteredHouseholds.length} of {households.length}
          </span>
        </h2>

        <div className="household-2d-grid">
          {filteredHouseholds.map((house) => (
            <div key={house.houseId} className="house-card">
              <div className="house-card-header">
                <span className="house-id">{house.houseId}</span>
                <span className="gps-tag">
                  {Number(house.latitude).toFixed(4)}, {Number(house.longitude).toFixed(4)}
                </span>
              </div>

              <div className="device-specs">
                {(filterType === "ALL" || filterType === "SOLAR") && (
                  <div className="device-box solar">
                    <div className="device-title">Solar Array</div>
                    {house.solar ? (
                      <>
                        <div className="device-value">
                          {Number(house.solar.outputWatts || 0).toFixed(1)} W
                        </div>
                        <span className="status-tag generating">GENERATING</span>
                      </>
                    ) : (
                      <div className="device-value offline">Connecting...</div>
                    )}
                  </div>
                )}

                {(filterType === "ALL" || filterType === "BATTERY") && (
                  <div className="device-box battery">
                    <div className="device-title">Home Battery</div>
                    {house.battery ? (
                      <>
                        <div className="device-value">
                          {Number(house.battery.outputWatts || 0).toFixed(1)} W
                        </div>
                        <div className="battery-level">
                          Charge: {Number(house.battery.batteryLevelPct || 0).toFixed(1)}%
                        </div>
                        <span className={`status-tag ${String(house.battery.status || "IDLE").toLowerCase()}`}>
                          {house.battery.status || "IDLE"}
                        </span>
                      </>
                    ) : (
                      <div className="device-value offline">Connecting...</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
