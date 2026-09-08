import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import HouseholdMarker from "./HouseholdMarker.jsx";

const MAHARASHTRA_CENTER = [19, 77];
const MAX_INTENSITY_WATTS = 100000;

function toNumber(...values) {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function getCoordinates(household) {
  const latitude = toNumber(household?.latitude, household?.lat);
  const longitude = toNumber(
    household?.longitude,
    household?.lng,
    household?.lon,
  );

  if (
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return [latitude, longitude];
}

function getGenerationWatts(household) {
  return Math.max(
    0,
    toNumber(
      household?.generationWatts,
      Number(household?.generationKw) * 1000,
      household?.solar?.generationWatts,
      Number(household?.solar?.generationKw) * 1000,
      household?.solar?.outputWatts,
    ),
  );
}

function getConsumptionWatts(household) {
  return Math.max(
    0,
    toNumber(
      household?.consumptionWatts,
      Number(household?.consumptionKw) * 1000,
      household?.powerWatts,
      Number(household?.powerKw) * 1000,
      household?.battery?.consumptionWatts,
      Number(household?.battery?.consumptionKw) * 1000,
      household?.battery?.outputWatts,
    ),
  );
}

function HeatmapLayer({ points, gradient, radius, blur }) {
  const map = useMap();

  useEffect(() => {
    if (typeof window.L?.heatLayer !== "function") {
      console.warn(
        "leaflet.heat is not initialized. Check that window.L is assigned before loading the plugin.",
      );
      return undefined;
    }

    const heatLayer = L.heatLayer(points, {
      radius,
      blur,
      maxZoom: 11,
      max: 1,
      minOpacity: 0.3,
      gradient,
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, gradient, radius, blur]);

  return null;
}

function MapFlyTo({ activeHouse }) {
  const map = useMap();

  useEffect(() => {
    if (!activeHouse) return;

    const coordinates = getCoordinates(activeHouse);
    if (!coordinates) return;

    map.flyTo(coordinates, 16, {
      animate: true,
      duration: 1.5,
    });
  }, [activeHouse, map]);

  return null;
}

export default function GridMap({
  households = [],
  onHouseSelect,
  activeHouse,
}) {
  const safeHouseholds = useMemo(
    () =>
      Array.isArray(households)
        ? households
        : Object.values(households || {}),
    [households],
  );

  const { generationPoints, consumptionPoints } = useMemo(() => {
    const generation = [];
    const consumption = [];

    safeHouseholds.forEach((household) => {
      const coordinates = getCoordinates(household);
      if (!coordinates) return;

      const generationIntensity = Math.min(
        getGenerationWatts(household) / MAX_INTENSITY_WATTS,
        1,
      );
      const consumptionIntensity = Math.min(
        getConsumptionWatts(household) / MAX_INTENSITY_WATTS,
        1,
      );

      if (generationIntensity > 0) {
        generation.push([...coordinates, generationIntensity]);
      }

      if (consumptionIntensity > 0) {
        consumption.push([...coordinates, consumptionIntensity]);
      }
    });

    return {
      generationPoints: generation,
      consumptionPoints: consumption,
    };
  }, [safeHouseholds]);

  return (
    <section
      className="grid-map-shell"
      aria-label="Maharashtra live microgrid map"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "540px",
        overflow: "hidden",
      }}
    >
      <MapContainer
        center={MAHARASHTRA_CENTER}
        zoom={7}
        minZoom={5}
        maxZoom={18}
        scrollWheelZoom
        zoomControl
        preferCanvas
        zoomAnimation={false}
        markerZoomAnimation={false}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "540px",
          background: "#0f172a",
        }}
      >
        <MapFlyTo activeHouse={activeHouse} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          updateWhenZooming={false}
          updateWhenIdle
          keepBuffer={1}
        />

        {/* Generation layer: green to yellow */}
        <HeatmapLayer
          points={generationPoints}
          radius={32}
          blur={24}
          gradient={{
            0.2: "#064e3b",
            0.45: "#10b981",
            0.7: "#facc15",
            1: "#fff7ed",
          }}
        />

        {/* Consumption layer: blue to red */}
        <HeatmapLayer
          points={consumptionPoints}
          radius={28}
          blur={22}
          gradient={{
            0.2: "#172554",
            0.45: "#2563eb",
            0.7: "#f97316",
            1: "#dc2626",
          }}
        />

        <MarkerClusterGroup
          chunkedLoading
          chunkInterval={100}
          chunkDelay={25}
          removeOutsideVisibleBounds
          animate={false}
          showCoverageOnHover={false}
          maxClusterRadius={60}
          spiderfyOnMaxZoom
        >
          {safeHouseholds.map((household) => (
            <HouseholdMarker
              key={`${household.houseId || household.deviceId}-${household.solar?.status || "WAITING"}`}
              household={household}
              onSelect={onHouseSelect}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>

      <div
        className="map-legend"
        style={{
          position: "absolute",
          left: "16px",
          bottom: "16px",
          zIndex: 1000,
          display: "grid",
          gap: "5px",
          padding: "10px 12px",
          borderRadius: "10px",
          color: "#f8fafc",
          background: "rgba(15, 23, 42, 0.82)",
          font: "12px/1.35 system-ui, sans-serif",
        }}
      >
        <strong>Heatmap layers</strong>
        <span>Generation: green to yellow</span>
        <span>Consumption: blue to red</span>
      </div>
    </section>
  );
}
