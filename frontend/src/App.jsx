import { useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import GridMap from './components/GridMap.jsx';
import MonitoringDashboard from './components/MonitoringDashboard.jsx';
import * as mockTelemetryModule from './data/mockTelemetry.js';
import './App.css';

const DEFAULT_BROKER_URL = 'ws://localhost:8080/ws-grid';
const TELEMETRY_TOPIC = '/topic/telemetry';
const THEME_STORAGE_KEY = 'app-theme';
const UI_UPDATE_INTERVAL = 1000;
const MAX_DEVICES = 50000;
const MAX_RECENT_EVENTS = 40;

const MAHARASHTRA_CENTER = { latitude: 19.7515, longitude: 75.7139 };

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getMockDevices() {
  const exportedDevices =
    mockTelemetryModule.initialMockDevices ??
    mockTelemetryModule.mockTelemetry ??
    mockTelemetryModule.default ??
    [];

  return Array.isArray(exportedDevices)
    ? exportedDevices
    : exportedDevices && typeof exportedDevices === 'object'
      ? Object.values(exportedDevices)
      : [];
}

function normalizeTelemetry(rawPayload, previous = {}) {
  const payload = rawPayload?.payload && typeof rawPayload.payload === 'object'
    ? { ...rawPayload, ...rawPayload.payload }
    : rawPayload;

  const deviceId = firstDefined(payload?.deviceId, payload?.device_id, payload?.id);
  if (deviceId === undefined || deviceId === null || deviceId === '') return null;

  const merged = { ...previous, ...payload };
  const location = merged.location && typeof merged.location === 'object' ? merged.location : {};

  return {
    ...merged,
    deviceId: String(deviceId),
    deviceType: firstDefined(merged.deviceType, merged.device_type, previous.deviceType, 'UNKNOWN_DEVICE'),
    status: String(firstDefined(merged.status, merged.state, previous.status, 'IDLE')).toUpperCase(),
    outputWatts: toNumber(firstDefined(merged.outputWatts, merged.output_watts, merged.power, previous.outputWatts), 0),
    batteryLevelPct: toNumber(firstDefined(merged.batteryLevelPct, merged.battery_level, merged.batteryLevel, previous.batteryLevelPct), 0),
    latitude: toNumber(firstDefined(merged.latitude, merged.lat, location.latitude, location.lat, previous.latitude, MAHARASHTRA_CENTER.latitude), MAHARASHTRA_CENTER.latitude),
    longitude: toNumber(firstDefined(merged.longitude, merged.lng, merged.lon, location.longitude, location.lng, location.lon, previous.longitude, MAHARASHTRA_CENTER.longitude), MAHARASHTRA_CENTER.longitude),
    timestamp: firstDefined(merged.timestamp, merged.eventTime, merged.createdAt, new Date().toISOString()),
  };
}

function normalizeEvent(rawPayload, receivedAt) {
  const payload = rawPayload?.payload && typeof rawPayload.payload === 'object'
    ? { ...rawPayload, ...rawPayload.payload }
    : rawPayload || {};
  const status = String(firstDefined(payload.status, payload.state, payload.processingStatus, 'PROCESSED')).toUpperCase();
  const eventTimestamp = firstDefined(payload.timestamp, payload.eventTime, payload.createdAt);
  const eventTime = eventTimestamp ? new Date(eventTimestamp).getTime() : NaN;
  const receivedTime = receivedAt.getTime();
  const latency = Number.isFinite(eventTime) ? Math.max(0, receivedTime - eventTime) : null;
  const processingValue = firstDefined(payload.processingMs, payload.processingTimeMs, payload.processingTime, payload.processing_time_ms);
  const deviceId = firstDefined(payload.deviceId, payload.device_id, payload.id, 'unknown');
  const eventId = firstDefined(payload.eventId, payload.event_id, payload.id, `${deviceId}-${receivedTime}`);

  return {
    id: String(eventId),
    deviceId: String(deviceId),
    eventType: String(firstDefined(payload.eventType, payload.event_type, payload.type, 'TELEMETRY')),
    status,
    partition: firstDefined(payload.partition, payload.kafkaPartition),
    offset: firstDefined(payload.offset, payload.kafkaOffset),
    processingMs: processingValue == null ? null : toNumber(processingValue, null),
    latencyMs: latency,
    timestamp: eventTimestamp || receivedAt.toISOString(),
    receivedAt: receivedAt.toISOString(),
  };
}

function createInitialDeviceMap() {
  return getMockDevices().reduce((result, device) => {
    const normalized = normalizeTelemetry(device);
    if (normalized) result[normalized.deviceId] = normalized;
    return result;
  }, {});
}

export default function App() {
  const [devicesById, setDevicesById] = useState(() => createInitialDeviceMap());
  const [recentEvents, setRecentEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const [lastMessageAt, setLastMessageAt] = useState(null);
  const [isDark, setIsDark] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) === 'dark');
  const [streamStats, setStreamStats] = useState({ received: 0, processed: 0, failed: 0, processingTotal: 0, processingCount: 0, latencyTotal: 0, latencyCount: 0 });

  const devicesByIdRef = useRef(devicesById);
  const recentEventsRef = useRef(recentEvents);
  const streamStatsRef = useRef(streamStats);
  const pendingDevicesRef = useRef(null);
  const pendingEventsRef = useRef(null);
  const pendingStatsRef = useRef(null);
  const pendingMessageAtRef = useRef(null);
  const updateTimerRef = useRef(null);

  const devices = useMemo(() => Object.values(devicesById), [devicesById]);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    const brokerUrl = import.meta.env.VITE_TELEMETRY_WS_URL || DEFAULT_BROKER_URL;

    const flushUpdates = () => {
      if (pendingDevicesRef.current) {
        setDevicesById(pendingDevicesRef.current);
        pendingDevicesRef.current = null;
      }
      if (pendingEventsRef.current) {
        recentEventsRef.current = pendingEventsRef.current;
        setRecentEvents(pendingEventsRef.current);
        pendingEventsRef.current = null;
      }
      if (pendingStatsRef.current) {
        streamStatsRef.current = pendingStatsRef.current;
        setStreamStats(pendingStatsRef.current);
        pendingStatsRef.current = null;
      }
      if (pendingMessageAtRef.current) {
        setLastMessageAt(pendingMessageAtRef.current);
        pendingMessageAtRef.current = null;
      }
      updateTimerRef.current = null;
    };

    const scheduleUpdate = () => {
      if (updateTimerRef.current === null) {
        updateTimerRef.current = window.setTimeout(flushUpdates, UI_UPDATE_INTERVAL);
      }
    };

    const client = new Client({
      brokerURL: brokerUrl,
      reconnectDelay: 3000,
      onConnect: () => {
        setIsConnected(true);
        setConnectionError('');
        client.subscribe(TELEMETRY_TOPIC, (message) => {
          const receivedAt = new Date();
          if (!message.body) return;
          try {
            const rawPayload = JSON.parse(message.body);
            const deviceId = firstDefined(rawPayload.deviceId, rawPayload.device_id, rawPayload.id, rawPayload.payload?.deviceId, rawPayload.payload?.device_id);
            const previous = deviceId ? devicesByIdRef.current[String(deviceId)] ?? {} : {};
            const device = normalizeTelemetry(rawPayload, previous);
            const event = normalizeEvent(rawPayload, receivedAt);
            if (!device) return;

            const nextDevices = { ...devicesByIdRef.current, [device.deviceId]: device };
            const trimmedDevices = Object.keys(nextDevices).length > MAX_DEVICES
              ? Object.fromEntries(Object.entries(nextDevices).slice(-MAX_DEVICES))
              : nextDevices;
            devicesByIdRef.current = trimmedDevices;

            const nextEvents = [event, ...(pendingEventsRef.current || recentEventsRef.current)].slice(0, MAX_RECENT_EVENTS);
            const previousStats = pendingStatsRef.current || streamStatsRef.current;
            const processingMs = event.processingMs;
            const latencyMs = event.latencyMs;
            const nextStats = {
              received: previousStats.received + 1,
              processed: previousStats.processed + (event.status === 'PROCESSED' || event.status === 'SUCCESS' ? 1 : 0),
              failed: previousStats.failed + (['FAILED', 'ERROR', 'REJECTED'].includes(event.status) ? 1 : 0),
              processingTotal: previousStats.processingTotal + (processingMs ?? 0),
              processingCount: previousStats.processingCount + (processingMs == null ? 0 : 1),
              latencyTotal: previousStats.latencyTotal + (latencyMs ?? 0),
              latencyCount: previousStats.latencyCount + (latencyMs == null ? 0 : 1),
            };

            pendingDevicesRef.current = trimmedDevices;
            pendingEventsRef.current = nextEvents;
            pendingStatsRef.current = nextStats;
            recentEventsRef.current = nextEvents;
            streamStatsRef.current = nextStats;
            pendingMessageAtRef.current = receivedAt;
            scheduleUpdate();
          } catch (error) {
            console.error('Unable to parse telemetry message:', error);
            setConnectionError('Received an invalid telemetry message.');
          }
        });
      },
      onDisconnect: () => setIsConnected(false),
      onWebSocketClose: () => setIsConnected(false),
      onWebSocketError: () => {
        setIsConnected(false);
        setConnectionError('Unable to reach the telemetry WebSocket.');
      },
      onStompError: (frame) => {
        setIsConnected(false);
        setConnectionError(frame.headers?.message || 'The telemetry broker returned an error.');
      },
    });

    client.activate();
    return () => {
      if (updateTimerRef.current !== null) window.clearTimeout(updateTimerRef.current);
      client.deactivate();
    };
  }, []);

  const totalSolarGeneration = devices.filter((device) => device.deviceType === 'SOLAR_PANEL').reduce((sum, device) => sum + device.outputWatts, 0);
  const batteryDevices = devices.filter((device) => device.deviceType === 'BATTERY');
  const averageBatteryLevel = batteryDevices.length ? batteryDevices.reduce((sum, device) => sum + device.batteryLevelPct, 0) / batteryDevices.length : 0;
  const netGridBalance = devices.reduce((sum, device) => device.deviceType === 'SOLAR_PANEL' ? sum + device.outputWatts : device.deviceType === 'BATTERY' ? sum - device.outputWatts : sum, 0);
  const successRate = streamStats.received ? ((streamStats.processed / streamStats.received) * 100) : 0;
  const monitoringMetrics = {
    recentEvents,
    activeDevices: devices.length,
    receivedEvents: streamStats.received,
    processedEvents: streamStats.processed,
    failedEvents: streamStats.failed,
    throughputPerSecond: streamStats.received,
    successRate,
    averageProcessingMs: streamStats.processingCount ? streamStats.processingTotal / streamStats.processingCount : 0,
    averageLatencyMs: streamStats.latencyCount ? streamStats.latencyTotal / streamStats.latencyCount : 0,
    lastEventAt: lastMessageAt,
  };

  return (
    <div className={`app-shell ${isDark ? 'dark' : ''}`}>
      <header className="app-header">
        <div>
          <p className="eyebrow">GRIDWEAVER · WEEK 3</p>
          <h1>Maharashtra Microgrid Platform</h1>
          <p className="app-subtitle">Kafka telemetry monitoring and high-performance GIS rendering</p>
        </div>
        <div className="app-header-actions">
          <div className="connection-panel" aria-live="polite">
            <span className={`connection-dot ${isConnected ? 'online' : 'offline'}`} aria-hidden="true" />
            <div>
              <strong>{isConnected ? 'Live stream connected' : 'Offline fallback'}</strong>
              <span>{lastMessageAt ? lastMessageAt.toLocaleTimeString() : 'Waiting for telemetry'}</span>
            </div>
          </div>
          <button type="button" className="theme-toggle" onClick={() => setIsDark((current) => !current)}>
            {isDark ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </header>

      <div className="stats-grid">
        <div className="stat-card"><h3>Net Grid Balance</h3><p className="stat-value">{netGridBalance.toFixed(1)} W</p></div>
        <div className="stat-card"><h3>Total Solar Generation</h3><p className="stat-value watts">{totalSolarGeneration.toFixed(1)} W</p></div>
        <div className="stat-card"><h3>Avg Battery Level</h3><p className="stat-value battery">{averageBatteryLevel.toFixed(1)}%</p></div>
        <div className="stat-card"><h3>Active Devices</h3><p className="stat-value">{devices.length.toLocaleString()}</p></div>
      </div>

      {connectionError && <p className="connection-error" role="status">{connectionError} Mock telemetry remains visible while the backend is unavailable.</p>}

      <MonitoringDashboard metrics={monitoringMetrics} />

      <main className="map-panel">
        <GridMap devices={devices} />
      </main>
    </div>
  );
}
