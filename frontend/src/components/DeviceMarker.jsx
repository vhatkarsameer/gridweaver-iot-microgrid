import { useMemo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const STATUS_STYLES = {
  GENERATING: {
    color: '#059669',
    symbol: '↥',
    label: 'Generating',
  },
  CHARGING: {
    color: '#10b981',
    symbol: '+',
    label: 'Charging',
  },
  DISCHARGING: {
    color: '#d97706',
    symbol: '↧',
    label: 'Discharging',
  },
  IDLE: {
    color: '#64748b',
    symbol: '–',
    label: 'Idle',
  },
  FAULT: {
    color: '#dc2626',
    symbol: '!',
    label: 'Fault',
  },
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatNumber(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : '0.0';
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return 'Not available';
  }

  const parsedDate = new Date(timestamp);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Invalid timestamp';
  }

  return parsedDate.toLocaleString();
}

function createMarkerIcon(status) {
  const style = STATUS_STYLES[status] ?? {
    color: '#3b82f6',
    symbol: '?',
    label: 'Unknown',
  };

  return L.divIcon({
    className: 'gridweaver-device-marker',
    html: `
      <div
        title="${escapeHtml(style.label)}"
        style="
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #ffffff;
          border-radius: 50%;
          background: ${style.color};
          color: #ffffff;
          box-shadow: 0 3px 10px rgba(15, 23, 42, 0.35);
          font-family: system-ui, sans-serif;
          font-size: 17px;
          font-weight: 800;
          line-height: 1;
        "
      >
        ${escapeHtml(style.symbol)}
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -17],
  });
}

export default function DeviceMarker({ device }) {
  const normalizedStatus = String(device?.status ?? 'IDLE').toUpperCase();
  const markerIcon = useMemo(
    () => createMarkerIcon(normalizedStatus),
    [normalizedStatus],
  );

  if (!device) {
    return null;
  }

  const {
    deviceId,
    deviceType,
    status = 'IDLE',
    outputWatts = 0,
    batteryLevelPct = 0,
    latitude,
    longitude,
    timestamp,
  } = device;

  const statusStyle = STATUS_STYLES[normalizedStatus] ?? {
    color: '#3b82f6',
    symbol: '?',
    label: 'Unknown',
  };

  const safeLatitude = Number(latitude);
  const safeLongitude = Number(longitude);

  if (!Number.isFinite(safeLatitude) || !Number.isFinite(safeLongitude)) {
    return null;
  }

  return (
    <Marker
      position={[safeLatitude, safeLongitude]}
      icon={markerIcon}
      title={`${deviceId ?? 'Unknown device'} - ${statusStyle.label}`}
    >
      <Popup>
        <section className="device-popup" aria-label={`Details for ${deviceId}`}>
          <div className="device-popup-header">
            <div>
              <h3>{deviceId ?? 'Unknown device'}</h3>
              <p>{deviceType ?? 'Unknown device type'}</p>
            </div>
            <span
              className="device-status-badge"
              style={{
                backgroundColor: `${statusStyle.color}20`,
                color: statusStyle.color,
                borderColor: `${statusStyle.color}55`,
              }}
            >
              {statusStyle.label}
            </span>
          </div>

          <div className="device-popup-divider" />

          <dl className="device-metrics">
            <div>
              <dt>Output</dt>
              <dd>{formatNumber(outputWatts)} W</dd>
            </div>
            <div>
              <dt>Battery</dt>
              <dd>{formatNumber(batteryLevelPct)}%</dd>
            </div>
            <div>
              <dt>Coordinates</dt>
              <dd>
                {safeLatitude.toFixed(4)}, {safeLongitude.toFixed(4)}
              </dd>
            </div>
          </dl>

          <p className="device-last-updated">
            Last updated: {formatTimestamp(timestamp)}
          </p>
        </section>
      </Popup>
    </Marker>
  );
}

