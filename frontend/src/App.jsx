import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import GridMap from './components/GridMap.jsx';
import './App.css';

const BROKER_URL = 'ws://localhost:8080/ws-grid';
const TELEMETRY_DESTINATION = '/topic/telemetry';
const UI_UPDATE_INTERVAL_MS = 1000;
const MAX_DEVICES = 50000;

function firstDefined(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== '',
  );
}

function asNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function unwrapEvent(value) {
  if (!value || typeof value !== 'object') {
    return {};
  }

  if (value.payload && typeof value.payload === 'object') {
    return value.payload;
  }

  if (value.data && typeof value.data === 'object') {
    return value.data;
  }

  return value;
}

function normalizeDevice(rawMessage) {
  const rawDevice = unwrapEvent(rawMessage);

  const deviceId = firstDefined(
    rawDevice.deviceId,
    rawDevice.id,
    rawDevice.nodeId,
    rawDevice.device?.deviceId,
    rawDevice.device?.id,
  );

  if (!deviceId) {
    return null;
  }

  const telemetry = rawDevice.telemetry && typeof rawDevice.telemetry === 'object'
    ? rawDevice.telemetry
    : {};

  return {
    ...rawDevice,
    deviceId: String(deviceId),
    latitude: firstDefined(
      rawDevice.latitude,
      rawDevice.lat,
      rawDevice.location?.latitude,
      rawDevice.location?.lat,
    ),
    longitude: firstDefined(
      rawDevice.longitude,
      rawDevice.lng,
      rawDevice.lon,
      rawDevice.location?.longitude,
      rawDevice.location?.lng,
      rawDevice.location?.lon,
    ),
    status: firstDefined(rawDevice.status, telemetry.status, 'UNKNOWN'),
    solarGeneration: firstDefined(
      rawDevice.solarGeneration,
      rawDevice.solarGen,
      rawDevice.solarPower,
      telemetry.solarGeneration,
      telemetry.solarGen,
      telemetry.solarPower,
      0,
    ),
    batteryLevel: firstDefined(
      rawDevice.batteryLevel,
      rawDevice.battery,
      telemetry.batteryLevel,
      telemetry.battery,
      0,
    ),
    netGridBalance: firstDefined(
      rawDevice.netGridBalance,
      rawDevice.gridBalance,
      telemetry.netGridBalance,
      telemetry.gridBalance,
      0,
    ),
    power: firstDefined(
      rawDevice.power,
      rawDevice.powerOutput,
      telemetry.power,
      telemetry.powerOutput,
      0,
    ),
    updatedAt: firstDefined(
      rawDevice.updatedAt,
      rawDevice.timestamp,
      telemetry.updatedAt,
      telemetry.timestamp,
      new Date().toISOString(),
    ),
  };
}

function formatNumber(value, digits = 1) {
  return asNumber(value).toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
}

function StatCard({ label, value, unit, tone }) {
  return (
    <article className={`stat-card ${tone || ''}`}>
      <span className="stat-card-label">{label}</span>
      <strong className="stat-card-value">{value}</strong>
      {unit && <small className="stat-card-unit">{unit}</small>}
    </article>
  );
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return localStorage.getItem('app-theme') === 'dark';
    } catch {
      return false;
    }
  });
  const [devicesById, setDevicesById] = useState(() => new Map());
  const [connectionState, setConnectionState] = useState('connecting');
  const [lastMessageAt, setLastMessageAt] = useState(null);
  const pendingDevicesRef = useRef(new Map());
  const updateTimerRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.body.classList.toggle('dark', isDarkMode);
    try {
      localStorage.setItem('app-theme', isDarkMode ? 'dark' : 'light');
    } catch {
      // Storage may be unavailable in private browsing; the UI still works.
    }
  }, [isDarkMode]);

  const flushPendingDevices = useCallback(() => {
    updateTimerRef.current = null;
    const pendingDevices = pendingDevicesRef.current;

    if (pendingDevices.size === 0) {
      return;
    }

    setDevicesById((previous) => {
      const next = new Map(previous);
      pendingDevices.forEach((device, deviceId) => {
        next.set(deviceId, device);
      });
      pendingDevices.clear();

      // Keep the most recently updated records when a stream exceeds the cap.
      if (next.size > MAX_DEVICES) {
        const entries = Array.from(next.entries()).slice(-MAX_DEVICES);
        return new Map(entries);
      }

      return next;
    });
  }, []);

  const queueDeviceUpdate = useCallback((device) => {
    if (!device?.deviceId) {
      return;
    }

    pendingDevicesRef.current.set(device.deviceId, device);

    if (!updateTimerRef.current) {
      updateTimerRef.current = window.setTimeout(
        flushPendingDevices,
        UI_UPDATE_INTERVAL_MS,
      );
    }
  }, [flushPendingDevices]);

  useEffect(() => {
    const client = new Client({
      brokerURL: BROKER_URL,
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => {},

      onConnect: () => {
        setConnectionState('connected');

        client.subscribe(TELEMETRY_DESTINATION, (message) => {
          try {
            const parsed = JSON.parse(message.body);
            const events = Array.isArray(parsed)
              ? parsed
              : Array.isArray(parsed.events)
                ? parsed.events
                : [parsed];

            events.forEach((event) => {
              const device = normalizeDevice(event);
              if (device) {
                queueDeviceUpdate(device);
                setLastMessageAt(Date.now());
              }
            });
          } catch (error) {
            console.error('Invalid telemetry message:', error);
          }
        });
      },

      onWebSocketClose: () => {
        setConnectionState('disconnected');
      },

      onWebSocketError: () => {
        setConnectionState('disconnected');
      },

      onStompError: () => {
        setConnectionState('disconnected');
      },
    });

    setConnectionState('connecting');
    client.activate();

    return () => {
      if (updateTimerRef.current) {
        window.clearTimeout(updateTimerRef.current);
      }
      pendingDevicesRef.current.clear();
      client.deactivate();
    };
  }, [queueDeviceUpdate]);

  const devices = useMemo(() => Array.from(devicesById.values()), [devicesById]);

  const stats = useMemo(() => {
    if (devices.length === 0) {
      return {
        netGridBalance: 0,
        totalSolarGeneration: 0,
        averageBatteryLevel: 0,
        onlineDevices: 0,
      };
    }

    const totalSolarGeneration = devices.reduce(
      (sum, device) => sum + asNumber(device.solarGeneration),
      0,
    );
    const netGridBalance = devices.reduce(
      (sum, device) => sum + asNumber(device.netGridBalance),
      0,
    );
    const averageBatteryLevel = devices.reduce(
      (sum, device) => sum + asNumber(device.batteryLevel),
      0,
    ) / devices.length;
    const onlineDevices = devices.filter((device) =>
      ['ONLINE', 'ACTIVE', 'CONNECTED', 'OK'].includes(
        String(device.status).toUpperCase(),
      ),
    ).length;

    return {
      netGridBalance,
      totalSolarGeneration,
      averageBatteryLevel,
      onlineDevices,
    };
  }, [devices]);

  const connectionLabel = connectionState === 'connected'
    ? 'Live stream connected'
    : connectionState === 'connecting'
      ? 'Connecting to live stream…'
      : 'Live stream disconnected';

  return (
    <div className={`app-shell ${isDarkMode ? 'dark' : ''}`}>
      <header className="app-header">
        <div>
          <p className="app-eyebrow">GRIDWEAVER IOT MICROGRID</p>
          <h1>Maharashtra Energy Dashboard</h1>
          <p className="app-subtitle">
            High-performance live GIS monitoring for {devices.length.toLocaleString()} devices.
          </p>
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setIsDarkMode((current) => !current)}
          aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDarkMode ? 'Light mode' : 'Dark mode'}
        </button>
      </header>

      <main className="dashboard-content">
        <div className={`connection-banner ${connectionState}`}>
          <span className="status-dot" />
          <span>{connectionLabel}</span>
          {lastMessageAt && (
            <span className="last-message">
              Last event: {new Date(lastMessageAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        <section className="stats-grid" aria-label="Grid statistics">
          <StatCard
            label="Net Grid Balance"
            value={formatNumber(stats.netGridBalance)}
            unit="kW"
            tone="blue"
          />
          <StatCard
            label="Total Solar Generation"
            value={formatNumber(stats.totalSolarGeneration)}
            unit="kW"
            tone="orange"
          />
          <StatCard
            label="Avg Battery Level"
            value={formatNumber(stats.averageBatteryLevel)}
            unit="%"
            tone="green"
          />
          <StatCard
            label="Online Devices"
            value={stats.onlineDevices.toLocaleString()}
            unit={`of ${devices.length.toLocaleString()}`}
            tone="purple"
          />
        </section>

        <GridMap devices={devices} />
      </main>
    </div>
  );
}
