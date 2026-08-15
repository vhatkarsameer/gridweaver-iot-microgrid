import React, { useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import "./App.css";

import GridMap from "./components/GridMap.jsx";
import { mockTelemetry } from "./data/mockTelemetry.js";

function App() {
  const [householdMap, setHouseholdMap] = useState({});
  const [connected, setConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  useEffect(() => {
    const client = new Client({
      brokerURL: "ws://localhost:8080/ws-telemetry",
 
      reconnectDelay: 3000,

      onConnect: () => {
        setConnected(true);

        client.subscribe("/topic/telemetry", (message) => {
          if (!message.body) return;

          const payload = JSON.parse(message.body);
          const houseId = payload.deviceId
            .replace("SOLAR-", "")
            .replace("BATT-", "");

          setHouseholdMap((previousMap) => {
            const currentHouse = previousMap[houseId] || {
              houseId,
              latitude: payload.latitude,
              longitude: payload.longitude,
              solar: null,
              battery: null,
            };

            if (payload.deviceType === "SOLAR_PANEL") {
              currentHouse.solar = payload;
            } else if (payload.deviceType === "BATTERY") {
              currentHouse.battery = payload;
            }

            return {
              ...previousMap,
              [houseId]: { ...currentHouse },
            };
          });
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
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h1>GridWeaver Microgrid Control Tower</h1>
          <p className="subtitle">Real-time Mumbai Household Energy Matrix</p>
        </div>

        <div className={`status-badge ${connected ? "online" : "offline"}`}>
          {connected ? "● LIVE STREAM CONNECTED" : "○ DISCONNECTED"}
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Active Households Online</h3>
          <p className="stat-value">{households.length}</p>
        </div>
        <div className="stat-card">
          <h3>Total Solar Generation</h3>
          <p className="stat-value watts">{totalSolarWatts.toFixed(1)} W</p>
        </div>
        <div className="stat-card">
          <h3>Total Battery Throughput</h3>
          <p className="stat-value battery">{totalBatteryWatts.toFixed(1)} W</p>
        </div>
      </div>

      <section
        style={{
          margin: "24px 0",
          padding: "16px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
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
            <h2 style={{ margin: 0 }}>Mumbai GIS Device Map</h2>
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
            <button className="clear-btn" onClick={() => setSearchTerm("")}>
              ✕
            </button>
          )}
        </div>

        <div className="filter-group">
          <button
            className={`filter-btn ${filterType === "ALL" ? "active" : ""}`}
            onClick={() => setFilterType("ALL")}
          >
            All Households
          </button>
          <button
            className={`filter-btn ${filterType === "SOLAR" ? "active" : ""}`}
            onClick={() => setFilterType("SOLAR")}
          >
            Solar Active
          </button>
          <button
            className={`filter-btn ${filterType === "BATTERY" ? "active" : ""}`}
            onClick={() => setFilterType("BATTERY")}
          >
            Battery Active
          </button>
        </div>
      </div>

      <div className="feed-section">
        <h2>
          Mumbai Microgrid Households
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
                  {house.latitude.toFixed(4)}, {house.longitude.toFixed(4)}
                </span>
              </div>

              <div className="device-specs">
                {(filterType === "ALL" || filterType === "SOLAR") && (
                  <div className="device-box solar">
                    <div className="device-title">Solar Array</div>
                    {house.solar ? (
                      <>
                        <div className="device-value">
                          {house.solar.outputWatts.toFixed(1)} W
                        </div>
                        <span className="status-tag generating">
                          GENERATING
                        </span>
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
                          {house.battery.outputWatts.toFixed(1)} W
                        </div>
                        <div className="battery-level">
                          Charge: {house.battery.batteryLevelPct.toFixed(1)}%
                        </div>
                        <span
                          className={`status-tag ${house.battery.status.toLowerCase()}`}
                        >
                          {house.battery.status}
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
