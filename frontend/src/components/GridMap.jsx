import { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import DeviceMarker from './DeviceMarker.jsx';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const MAHARASHTRA_CENTER = [19.7515, 75.7139];
const MAHARASHTRA_ZOOM = 7;
const MAHARASHTRA_BOUNDS = [
  [15.5, 72.0],
  [22.2, 81.5],
];

const canvasRenderer = L.canvas({ padding: 0.5 });

function firstDefined(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== '',
  );
}

function getCoordinates(device) {
  const latitude = Number(
    firstDefined(
      device.latitude,
      device.lat,
      device.location?.latitude,
      device.location?.lat,
    ),
  );
  const longitude = Number(
    firstDefined(
      device.longitude,
      device.lng,
      device.lon,
      device.location?.longitude,
      device.location?.lng,
      device.location?.lon,
    ),
  );

  return { latitude, longitude };
}

function getHeatWeight(device) {
  const telemetry = device.telemetry && typeof device.telemetry === 'object'
    ? device.telemetry
    : {};

  const value = Number(
    firstDefined(
      device.power,
      device.powerOutput,
      device.solarGeneration,
      device.solarPower,
      telemetry.power,
      telemetry.powerOutput,
      telemetry.solarGeneration,
      telemetry.solarPower,
      1,
    ),
  );

  if (!Number.isFinite(value)) {
    return 0.1;
  }

  return Math.max(0.05, Math.min(value / 100, 1));
}

function HeatmapLayer({ devices }) {
  const map = useMap();

  useEffect(() => {
    if (!L.heatLayer) {
      console.error('leaflet.heat did not load correctly.');
      return undefined;
    }

    const points = devices
      .map((device) => {
        const { latitude, longitude } = getCoordinates(device);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null;
        }
        return [latitude, longitude, getHeatWeight(device)];
      })
      .filter(Boolean);

    const heatLayer = L.heatLayer(points, {
      radius: 28,
      blur: 22,
      maxZoom: 13,
      minOpacity: 0.3,
      gradient: {
        0.2: '#2563eb',
        0.45: '#22c55e',
        0.7: '#facc15',
        1: '#ef4444',
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [devices, map]);

  return null;
}

export default function GridMap({ devices = [], telemetry = [] }) {
  const inputDevices = Array.isArray(devices) && devices.length > 0
    ? devices
    : telemetry;

  const safeDevices = Array.isArray(inputDevices)
    ? inputDevices.filter((device) => device && typeof device === 'object')
    : Object.values(inputDevices || {}).filter(
      (device) => device && typeof device === 'object',
    );

  return (
    <section
      className="grid-map-shell"
      aria-label="Maharashtra high-performance live GIS map"
    >
      <div className="grid-map-toolbar">
        <div>
          <p className="grid-map-eyebrow">WEEK 3 GIS PERFORMANCE VIEW</p>
          <h2>Maharashtra device network</h2>
          <p className="grid-map-description">
            Heatmap and clustered telemetry rendering for high-volume device data.
          </p>
        </div>
        <span className="grid-map-count">
          {safeDevices.length.toLocaleString()}{' '}
          {safeDevices.length === 1 ? 'device' : 'devices'}
        </span>
      </div>

      <div className="grid-map-canvas">
        <MapContainer
          center={MAHARASHTRA_CENTER}
          zoom={MAHARASHTRA_ZOOM}
          minZoom={5}
          maxZoom={18}
          maxBounds={MAHARASHTRA_BOUNDS}
          maxBoundsViscosity={0.25}
          scrollWheelZoom
          zoomControl
          preferCanvas
          zoomAnimation={false}
          markerZoomAnimation={false}
          renderer={canvasRenderer}
          style={{ width: '100%', height: '100%', minHeight: '540px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            updateWhenZooming={false}
            updateWhenIdle
            keepBuffer={1}
          />

          <HeatmapLayer devices={safeDevices} />

          <MarkerClusterGroup
            chunkedLoading
            chunkInterval={100}
            chunkDelay={25}
            removeOutsideVisibleBounds
            animate={false}
            showCoverageOnHover={false}
            maxClusterRadius={60}
            spiderfyOnMaxZoom
            zoomToBoundsOnClick
          >
            {safeDevices.map((device, index) => (
              <DeviceMarker
                key={device.deviceId || device.id || `device-${index}`}
                device={device}
              />
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </section>
  );
}
