import { useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import GridMap from './components/GridMap.jsx';
import * as mockTelemetryModule from './data/mockTelemetry.js';
import './App.css';

const DEFAULT_BROKER_URL = 'ws://localhost:8080/ws-grid';
const TELEMETRY_TOPIC = '/topic/telemetry';
const THEME_STORAGE_KEY = 'app-theme';
const UI_UPDATE_INTERVAL = 1000;

const VALID_STATUSES = new Set([
  'CHARGING',
  'IDLE',
  'GENERATING',
  'DISCHARGING',
  'FAULT',
]);

const MAHARASHTRA_CENTER = {
  latitude: 19.7515,
  longitude: 75.7139,
};

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
  const rawStatus = String(
    merged.status ?? merged.state ?? 'IDLE',
  ).toUpperCase();
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
    latitude: toNumber(
      merged.latitude,
      previous.latitude ?? MAHARASHTRA_CENTER.latitude,
    ),
    longitude: toNumber(
      merged.longitude,
      previous.longitude ?? MAHARASHTRA_CENTER.longitude,
    ),
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
  const [devicesById, setDevicesById] = useState(() => createInitialDeviceMap());
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [lastMessageAt, setLastMessageAt] = useState(null);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark';
  });

  const devicesByIdRef = useRef(devicesById);
  const pendingDevicesRef = useRef(null);
  const pendingMessageAtRef = useRef(null);
  const updateTimerRef = useRef(null);

  const devices = useMemo(
    () => Object.values(devicesById),
    [devicesById],
  );

  useEffect(() => {
    localStorage.setItem(
      THEME_STORAGE_KEY,
      isDark ? 'dark' : 'light',
    );
  }, [isDark]);

  useEffect(() => {
    const brokerUrl =
      import.meta.env.VITE_TELEMETRY_WS_URL || DEFAULT_BROKER_URL;

    const flushTelemetryUpdates = () => {
      if (pendingDevicesRef.current) {
        setDevicesById(pendingDevicesRef.current);
        pendingDevicesRef.current = null;
      }

      if (pendingMessageAtRef.current) {
        setLastMessageAt(pendingMessageAtRef.current);
        pendingMessageAtRef.current = null;
      }

      updateTimerRef.current = null;
    };

    const scheduleTelemetryUpdate = () => {
      if (updateTimerRef.current !== null) {
        return;
      }

      updateTimerRef.current = window.setTimeout(
        flushTelemetryUpdates,
        UI_UPDATE_INTERVAL,
      );
    };

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
            const currentDevices = devicesByIdRef.current;
            const previousDevice = currentDevices[payload.deviceId] ?? {};
            const updatedDevice = normalizeTelemetry(
              payload,
              previousDevice,
            );

            if (!updatedDevice) {
              return;
            }

            const nextDevices = {
              ...currentDevices,
              [updatedDevice.deviceId]: updatedDevice,
            };

            // Keep the latest data in a ref immediately, but update React only
            // once per second so the whole map does not re-render per message.
            devicesByIdRef.current = nextDevices;
            pendingDevicesRef.current = nextDevices;
            pendingMessageAtRef.current = new Date();
            scheduleTelemetryUpdate();
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
      if (updateTimerRef.current !== null) {
        window.clearTimeout(updateTimerRef.current);
        updateTimerRef.current = null;
      }

      flushTelemetryUpdates();
      client.deactivate();
    };
  }, []);

  const totalSolarGeneration = devices
    .filter((device) => device.deviceType === 'SOLAR_PANEL')
    .reduce(
      (total, device) => total + Number(device.outputWatts || 0),
      0,
    );

  const batteryDevices = devices.filter(
    (device) => device.deviceType === 'BATTERY',
  );

  const averageBatteryLevel = batteryDevices.length
    ? batteryDevices.reduce(
        (total, device) => total + Number(device.batteryLevelPct || 0),
        0,
      ) / batteryDevices.length
    : 0;

  const netGridBalance = devices.reduce((total, device) => {
    const output = Number(device.outputWatts || 0);

    if (device.deviceType === 'SOLAR_PANEL') {
      return total + output;
    }

    if (device.deviceType === 'BATTERY') {
      return total - output;
    }

    return total;
  }, 0);

  const latestMessageLabel = lastMessageAt
    ? lastMessageAt.toLocaleTimeString()
    : 'Waiting for telemetry';

  function toggleDarkTheme() {
    setIsDark((current) => !current);
  }

  return (
    <div className={`app-shell ${isDark ? 'dark' : ''}`}>
      <header className="app-header">
        <div>
          <p className="eyebrow">GRIDWEAVER · WEEK 2</p>
          <h1>Maharashtra Microgrid GIS</h1>
          <p className="app-subtitle">
            Live device-state visualization across Maharashtra
          </p>
        </div>

        <div className="app-header-actions">
          <div className="connection-panel" aria-live="polite">
            <span
              className={`connection-dot ${
                isConnected ? 'online' : 'offline'
              }`}
              aria-hidden="true"
            />
            <div>
              <strong>
                {isConnected ? 'Live stream connected' : 'Offline fallback'}
              </strong>
              <span>{latestMessageLabel}</span>
            </div>
          </div>

          <button
            type="button"
            className="theme-toggle"
            onClick={toggleDarkTheme}
            aria-label="Toggle dark theme"
          >
            {isDark ? 'Light mode' : 'Dark mode'}
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
          <p className="stat-value watts">
            {totalSolarGeneration.toFixed(1)} W
          </p>
        </div>

        <div className="stat-card">
          <h3>Avg Battery Level</h3>
          <p className="stat-value battery">
            {averageBatteryLevel.toFixed(1)}%
          </p>
        </div>
      </div>

      {connectionError && (
        <p className="connection-error" role="status">
          {connectionError} Mock telemetry remains visible while the backend is
          unavailable.
        </p>
      )}

      <main className="map-panel">
        <GridMap telemetry={devices} />
      </main>
    </div>
  );
}
