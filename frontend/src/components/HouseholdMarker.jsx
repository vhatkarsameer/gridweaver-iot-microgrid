import { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";

export default function HouseholdMarker({ household, onSelect }) {
  const hasFault = household.solar?.status === "FAULT" || household.battery?.status === "FAULT";
  const isGenerating = household.solar?.outputWatts > 0;

  const color = hasFault ? "#ef4444" : (isGenerating ? "#10b981" : "#3b82f6");

  const markerIcon = useMemo(
    () =>
      L.divIcon({
        className: "gridweaver-house-marker",
        html: `
          <div
            style="
              width: 32px;
              height: 32px;
              display: flex;
              align-items: center;
              justify-content: center;
              border-radius: 50%;
              background: ${color};
              border: 3px solid #ffffff;
              color: #ffffff;
              font-size: 16px;
              box-shadow: 0 0 0 4px ${color}33, 0 4px 10px rgba(15, 23, 42, 0.25);
            "
          >
            🏠
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
    [color]
  );

  return (
    <Marker
      position={[household.latitude, household.longitude]}
      icon={markerIcon}
      eventHandlers={{
        click: (e) => {
          e.originalEvent?.stopPropagation?.();
          if (onSelect) {
            onSelect(household.houseId);
          }
        },
      }}
    />
  );
}