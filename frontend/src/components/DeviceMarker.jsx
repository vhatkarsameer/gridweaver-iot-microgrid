import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const deviceIcon = L.divIcon({
  className: 'grid-device-marker',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
});

function firstDefined(...values) {
  return values.find(
    (value) => value !== undefined && value !== null && value !== '',
  );
}

function displayValue(value, suffix = '') {
  return `${firstDefined(value, 'N/A')}${suffix}`;
}

export default function DeviceMarker({ device }) {
  if (!device || typeof device !== 'object') {
    return null;
  }

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

  // Ignore incomplete records instead of allowing Leaflet to crash.
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const telemetry =
    device.telemetry && typeof device.telemetry === 'object'
      ? device.telemetry
      : {};

  const deviceId = firstDefined(
    device.deviceId,
    device.id,
    device.name,
    'Unknown device',
  );
  const status = firstDefined(device.status, telemetry.status, 'UNKNOWN');
  const solar = firstDefined(
    device.solarGeneration,
    device.solarGen,
    device.solarPower,
    telemetry.solarGeneration,
    telemetry.solarGen,
    telemetry.solarPower,
  );
  const battery = firstDefined(
    device.batteryLevel,
    device.battery,
    telemetry.batteryLevel,
    telemetry.battery,
  );
  const gridBalance = firstDefined(
    device.netGridBalance,
    device.gridBalance,
    telemetry.netGridBalance,
    telemetry.gridBalance,
  );
  const power = firstDefined(
    device.power,
    device.powerOutput,
    telemetry.power,
    telemetry.powerOutput,
  );
  const updatedAt = firstDefined(
    device.updatedAt,
    telemetry.updatedAt,
    device.timestamp,
    telemetry.timestamp,
  );

  return (
    <Marker position={[latitude, longitude]} icon={deviceIcon}>
      <Popup>
        <div className="device-popup">
          <h3>{deviceId}</h3>
          <p>
            <strong>Status:</strong> {status}
          </p>
          <p>
            <strong>Solar generation:</strong> {displayValue(solar, ' kW')}
          </p>
          <p>
            <strong>Battery level:</strong> {displayValue(battery, '%')}
          </p>
          <p>
            <strong>Grid balance:</strong> {displayValue(gridBalance, ' kW')}
          </p>
          <p>
            <strong>Power:</strong> {displayValue(power, ' kW')}
          </p>
          {updatedAt && (
            <p>
              <strong>Updated:</strong> {updatedAt}
            </p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
