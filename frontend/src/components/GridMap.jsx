import { MapContainer, TileLayer } from 'react-leaflet';
import DeviceMarker from './DeviceMarker.jsx';
import 'leaflet/dist/leaflet.css';

const MUMBAI_CENTER = [19.076, 72.8777];
const MUMBAI_ZOOM = 13;

export default function GridMap({ devices = [] }) {
  const safeDevices = Array.isArray(devices) ? devices : Object.values(devices);

  return (
    <section className="grid-map-shell" aria-label="Mumbai live microgrid map">
      <div className="grid-map-toolbar">
        <div>
          <p className="grid-map-eyebrow">LIVE GIS VIEW</p>
          <h2>Mumbai device network</h2>
        </div>
        <span className="grid-map-count">
          {safeDevices.length} {safeDevices.length === 1 ? 'device' : 'devices'}
        </span>
      </div>

      <div className="grid-map-canvas">
        <MapContainer
          center={MUMBAI_CENTER}
          zoom={MUMBAI_ZOOM}
          scrollWheelZoom={true}
          zoomControl={true}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {safeDevices.map((device) => (
            <DeviceMarker
              key={device.deviceId}
              device={device}
            />
          ))}
        </MapContainer>
      </div>
    </section>
  );
}


