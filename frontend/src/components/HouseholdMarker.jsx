import { memo, useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const HouseholdMarker = memo(
  function HouseholdMarker({ household, onSelect }) {
    if (!household) return null;

    const latitude = toNumber(household.latitude ?? household.lat, NaN);
    const longitude = toNumber(household.longitude ?? household.lng ?? household.lon, NaN);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    const solar = household.solar || {};
    const battery = household.battery || {};
    const houseId = household.houseId || household.deviceId || "Unknown household";

    const hasFault = solar.status === "FAULT" || battery.status === "FAULT";
    const isGenerating = toNumber(solar.outputWatts) > 0;
    const color = hasFault ? "#ef4444" : isGenerating ? "#10b981" : "#3b82f6";

    const markerIcon = useMemo(
      () =>
        L.divIcon({
          className: "gridweaver-household-marker",
          html: `<div style="width:14px;height:14px;background:${color};border:2px solid #ffffff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.35)"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9],
          popupAnchor: [0, -10],
        }),
      [color]
    );

    const generationKw = toNumber(solar.outputWatts) / 1000;
    const consumptionKw = toNumber(household.consumptionWatts ?? battery.outputWatts) / 1000;
    const batteryLevelPct = toNumber(household.batteryLevelPct ?? battery.batteryLevelPct);

    return (
      <Marker
        position={[latitude, longitude]}
        icon={markerIcon}
        eventHandlers={{
          click: (event) => {
            L.DomEvent.stopPropagation(event);
            onSelect?.(houseId);
          },
        }}
      >
        <Popup>
          <div className="household-popup">
            <strong>{houseId}</strong>
            <span>Generation: {generationKw.toFixed(2)} kW</span>
            <span>Consumption: {consumptionKw.toFixed(2)} kW</span>
            <span>Battery: {batteryLevelPct.toFixed(1)}%</span>
            <span>Solar status: {solar.status || "WAITING"}</span>
            <span>Battery status: {battery.status || "WAITING"}</span>
          </div>
        </Popup>
      </Marker>
    );
  },
  (previousProps, nextProps) => {
    const previous = previousProps.household;
    const next = nextProps.household;
    return (
      previous?.houseId === next?.houseId &&
      previous?.latitude === next?.latitude &&
      previous?.longitude === next?.longitude &&
      previous?.solar?.status === next?.solar?.status &&
      previous?.battery?.status === next?.battery?.status &&
      previous?.solar?.outputWatts === next?.solar?.outputWatts &&
      previous?.battery?.outputWatts === next?.battery?.outputWatts &&
      previous?.battery?.batteryLevelPct === next?.battery?.batteryLevelPct &&
      previousProps.onSelect === nextProps.onSelect
    );
  }
);

export default HouseholdMarker;