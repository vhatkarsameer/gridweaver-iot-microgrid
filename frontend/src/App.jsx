import { useEffect, useMemo, useState } from 'react';
import { Client } from '@stomp/stompjs';
import GridMap from './components/GridMap.jsx';
import * as mockTelemetryModule from './data/mockTelemetry.js';
import './App.css';

const DEFAULT_BROKER_URL = 'ws://localhost:8080/ws-telemetry';
const TELEMETRY_TOPIC = '/topic/telemetry';

const VALID_STATUSES = new Set([
  'CHARGING',
  'IDLE',
  'GENERATING',
  'DISCHARGING',
  'FAULT',
]);

function getMockDevices() {
  const exportedDevices =
    mockTelemetryModule.initialMockDevices ??
    mockTelemetryModule.mockTelemetry ??
    mockTelemetryModule.default ??
    [];

  if (Array.isArray(exportedDevices)) {
    return exportedDevices;
  }

  if (exportedDevices && typeof exportedDevices === 'object') {
    return Object.values(exportedDevices);
  }

  return [];
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeTelemetry(payload, previous = {}) {
  if (!payload || !payload.deviceId) {
    return null;
  }

  const merged = { ...previous, ...payload };
  const rawStatus = String(merged.status ?? merged.state ?? 'IDLE').toUpperCase();
  const status = VALID_STATUSES.has(rawStatus) ? rawStatus : 'IDLE';

  return {
    ...merged,
    deviceId: String(merged.deviceId),
    deviceType: merged.deviceType ?? previous.deviceType ?? 'UNKNOWN_DEVICE',
    status,
    outputWatts: toNumber(merged.outputWatts, previous.outputWatts ?? 0),
    batteryLevelPct: toNumber(
      merged.batteryLevelPct,
      previous.batteryLevelPct ?? 0,
    ),
    latitude: toNumber(merged.latitude, previous.latitude ?? 19.076),
    longitude: toNumber(merged.longitude, previous.longitude ?? 72.8777),
    timestamp: merged.timestamp ?? new Date().toISOString(),
  };
}

function createInitialDeviceMap() {
  return getMockDevices().reduce((deviceMap, device) => {
    const normalizedDevice = normalizeTelemetry(device);

    if (normalizedDevice) {
      deviceMap[normalizedDevice.deviceId] = normalizedDevice;
    }

    return deviceMap;
  }, {});
}

export default function App() {
  const [devicesById, setDevicesById] = useState(createInitialDeviceMap);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [lastMessageAt, setLastMessageAt] = useState(null);

  const devices = useMemo(() => Object.values(devicesById), [devicesById]);

  useEffect(() => {
    const brokerUrl =
      import.meta.env.VITE_TELEMETRY_WS_URL || DEFAULT_BROKER_URL;

    const client = new Client({
      brokerURL: brokerUrl,
      reconnectDelay: 3000,
      onConnect: () => {
        setIsConnected(true);
        setConnectionError('');

        client.subscribe(TELEMETRY_TOPIC, (message) => {
          if (!message.body) {
            return;
          }

          try {
            const payload = JSON.parse(message.body);

            setDevicesById((currentDevices) => {
              const previousDevice = currentDevices[payload.deviceId] ?? {};
              const updatedDevice = normalizeTelemetry(payload, previousDevice);

              if (!updatedDevice) {
                return currentDevices;
              }

              return {
                ...currentDevices,
                [updatedDevice.deviceId]: updatedDevice,
              };
            });

            setLastMessageAt(new Date());
          } catch (error) {
            console.error('Unable to parse telemetry message:', error);
            setConnectionError('Received an invalid telemetry message.');
          }
        });
      },
      onDisconnect: () => {
        setIsConnected(false);
      },
      onWebSocketClose: () => {
        setIsConnected(false);
      },
      onWebSocketError: () => {
        setIsConnected(false);
        setConnectionError('Unable to reach the telemetry WebSocket.');
      },
      onStompError: (frame) => {
        setIsConnected(false);
        setConnectionError(
          frame.headers?.message || 'The telemetry broker returned an error.',
        );
      },
    });

    client.activate();

    return () => {
      client.deactivate();
    };
  }, []);

  const latestMessageLabel = lastMessageAt
    ? lastMessageAt.toLocaleTimeString()
    : 'Waiting for telemetry';

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">GRIDWEAVER · WEEK 2</p>
          <h1>Mumbai Microgrid GIS</h1>
          <p className="app-subtitle">
            Live device-state visualization from the telemetry stream
          </p>
        </div>

        <div className="connection-panel" aria-live="polite">
          <span
            className={`connection-dot ${isConnected ? 'online' : 'offline'}`}
            aria-hidden="true"
          />
          <div>
            <strong>{isConnected ? 'Live stream connected' : 'Offline fallback'}</strong>
            <span>{latestMessageLabel}</span>
          </div>
        </div>
      </header>

      {connectionError && (
        <p className="connection-error" role="status">
          {connectionError} Mock telemetry remains visible while the backend is unavailable.
        </p>
      )}

      <main className="map-panel">
        <GridMap devices={devices} />
      </main>
    </div>
  );
}
