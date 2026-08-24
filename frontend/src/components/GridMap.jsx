import { MapContainer, TileLayer } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import DeviceMarker from './DeviceMarker.jsx';
import 'leaflet/dist/leaflet.css';

const MAHARASHTRA_CENTER = [19.7515, 75.7139];
const MAHARASHTRA_ZOOM = 7;

const MAHARASHTRA_BOUNDS = [
  [15.5, 72.0],
  [22.2, 81.5],
];

export default function GridMap({ devices = [], telemetry = [] }) {
  const inputDevices = devices.length > 0 ? devices : telemetry;
  const safeDevices = Array.isArray(inputDevices)
    ? inputDevices
    : Object.values(inputDevices || {});

  return (
    <section
      className="grid-map-shell"
      aria-label="Maharashtra live microgrid map"
    >
      <div className="grid-map-toolbar">
        <div>
          <p className="grid-map-eyebrow">LIVE GIS VIEW</p>
          <h2>Maharashtra device network</h2>
        </div>
        <span className="grid-map-count">
          {safeDevices.length}{' '}
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
          style={{ width: '100%', height: '100%', minHeight: '540px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            updateWhenZooming={false}
            updateWhenIdle
            keepBuffer={1}
          />

          <MarkerClusterGroup
            chunkedLoading
            chunkInterval={100}
            chunkDelay={25}
            removeOutsideVisibleBounds
            animate={false}
            showCoverageOnHover={false}
            maxClusterRadius={60}
          >
            {safeDevices.map((device) => (
              <DeviceMarker
                key={device.deviceId}
                device={device}
              />
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    </section>
  );
}
