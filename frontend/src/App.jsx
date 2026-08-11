import React, { useEffect, useState } from 'react';
import { Client } from '@stomp/stompjs';
import './App.css';

function App() {
  // Map of unique devices keyed by deviceId
  const [deviceMap, setDeviceMap] = useState({});
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const client = new Client({
      brokerURL: 'ws://localhost:8080/ws-grid',
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true);
        console.log('Connected to GridWeaver WebSocket Broker');

        client.subscribe('/topic/telemetry', (message) => {
          if (message.body) {
            const payload = JSON.parse(message.body);

            // Update or insert the device by its unique deviceId
            setDeviceMap((prevMap) => ({
              ...prevMap,
              [payload.deviceId]: payload,
            }));
          }
        });
      },
      onDisconnect: () => {
        setConnected(false);
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);

  // Convert device map to array for rendering
  const devices = Object.values(deviceMap);

  // Calculate live aggregate stats across all unique devices
  const totalWatts = devices.reduce((sum, d) => sum + d.outputWatts, 0);
  const solarCount = devices.filter((d) => d.deviceType === 'SOLAR_PANEL').length;
  const batteryCount = devices.filter((d) => d.deviceType === 'BATTERY').length;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>⚡ GridWeaver Microgrid Control</h1>
        <div className={`status-badge ${connected ? 'online' : 'offline'}`}>
          {connected ? '● LIVE STREAM CONNECTED' : '○ DISCONNECTED'}
        </div>
      </header>

      {/* Grid Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Power Output</h3>
          <p className="stat-value">{totalWatts.toFixed(1)} W</p>
        </div>
        <div className="stat-card">
          <h3>Active Solar Units</h3>
          <p className="stat-value">{solarCount}</p>
        </div>
        <div className="stat-card">
          <h3>Active Battery Units</h3>
          <p className="stat-value">{batteryCount}</p>
        </div>
      </div>

      {/* Live Device Status Registry Table */}
      <div className="feed-section">
        <h2>Live Microgrid Device Registry ({devices.length} Devices Online)</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Device ID</th>
                <th>Type</th>
                <th>Status</th>
                <th>Current Output</th>
                <th>Battery Level</th>
                <th>GIS Coordinates</th>
                <th>Last Ping</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((item) => (
                <tr key={item.deviceId}>
                  <td><strong>{item.deviceId}</strong></td>
                  <td>{item.deviceType}</td>
                  <td>
                    <span className={`status-tag ${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>{item.outputWatts.toFixed(1)} W</td>
                  <td>{item.batteryLevelPct > 0 ? `${item.batteryLevelPct.toFixed(1)}%` : 'N/A'}</td>
                  <td>{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</td>
                  <td>{new Date(item.timestamp).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
