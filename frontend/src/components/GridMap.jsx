import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import DeviceMarker from './DeviceMarker.jsx';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

const MAHARASHTRA_CENTER = [19.7515, 75.7139];
const MAHARASHTRA_ZOOM = 7;
const MAHARASHTRA_BOUNDS = [
  [15.5, 72.0],
  [22.2, 81.5],
];

function numberFrom(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

function HeatmapLayer({ devices }) {
  const map = useMap();
  const heatPoints = useMemo(
    () =>
      devices
        .map((device) => {
          const latitude = numberFrom(
            device.latitude,
            device.lat,
            device.location?.latitude,
            device.location?.lat,
          );
          const longitude = numberFrom(
            device.longitude,
            device.lng,
            device.lon,
            device.location?.longitude,
            device.location?.lng,
            device.location?.lon,
          );
          const intensity = Math.min(
            1,
            Math.max(
              0.15,
              numberFrom(
                device.heatIntensity,
                device.outputWatts,
                device.power,
                device.solarGeneration,
                1,
              ) / 1000,
            ),
          );

          return [latitude, longitude, intensity];
        })
        .filter(
          ([latitude, longitude]) =>
            latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180,
        ),
    [devices],
  );

  useEffect(() => {
    if (!map || heatPoints.length === 0 || typeof L.heatLayer !== 'function') {
      return undefined;
    }

    const heatLayer = L.heatLayer(heatPoints, {
      radius: 30,
      blur: 22,
      maxZoom: 12,
      minOpacity: 0.35,
      gradient: {
        0.15: '#2563eb',
        0.35: '#06b6d4',
        0.55: '#22c55e',
        0.75: '#facc15',
        1.0: '#ef4444',
      },
    });

    heatLayer.addTo(map);
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, heatPoints]);

  return null;
}

export default function GridMap({ devices = [], telemetry = [] }) {
  const inputDevices = devices.length > 0 ? devices : telemetry;
  const safeDevices = Array.isArray(inputDevices)
    ? inputDevices.filter((device) => device && typeof device === 'object')
    : Object.values(inputDevices || {}).filter((device) => device && typeof device === 'object');

  return (
    <section className="grid-map-shell" aria-label="Maharashtra live microgrid map">
      <div className="grid-map-toolbar">
        <div>
          <p className="grid-map-eyebrow">WEEK 3 GIS PERFORMANCE VIEW</p>
          <h2>Maharashtra device network</h2>
          <p className="grid-map-help">Heatmap intensity and clustered device markers for high-volume telemetry.</p>
        </div>
        <span className="grid-map-count">
          {safeDevices.length.toLocaleString()} {safeDevices.length === 1 ? 'device' : 'devices'}
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
          >
            {safeDevices.map((device, index) => (
              <DeviceMarker
                key={device.deviceId ?? device.id ?? `device-${index}`}
                device={device}
              />
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </section>
  );
}
