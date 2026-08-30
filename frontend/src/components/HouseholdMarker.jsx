import React, { useMemo } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";

const HouseholdMarker = React.memo(({ household, onSelect }) => {
  const hasFault = household.solar?.status === "FAULT" || household.battery?.status === "FAULT";
  const isGenerating = household.solar?.outputWatts > 0;

  const color = hasFault ? "#ef4444" : (isGenerating ? "#10b981" : "#3b82f6");

  // A highly optimized HTML icon that works perfectly with the clusterer
  const markerIcon = useMemo(() =>
    L.divIcon({
      className: "gridweaver-dot",
      html: `<div style="width: 14px; height: 14px; background: ${color}; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    }),
  [color]);

  return (
    <Marker
      position={[household.latitude, household.longitude]}
      icon={markerIcon}
      eventHandlers={{
        click: (e) => {
          L.DomEvent.stopPropagation(e);
          if (onSelect) onSelect(household.houseId);
        },
      }}
    />
  );
}, (prevProps, nextProps) => {
  // THE SILVER BULLET:
  // If the wattage changes but the visual color category stays the same, block the render!
  const getStatus = (h) => {
    const fault = h.solar?.status === "FAULT" || h.battery?.status === "FAULT";
    const gen = h.solar?.outputWatts > 0;
    return fault ? "red" : (gen ? "green" : "blue");
  };
  return getStatus(prevProps.household) === getStatus(nextProps.household);
});

export default HouseholdMarker;