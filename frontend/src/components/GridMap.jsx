import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import HouseholdMarker from "./HouseholdMarker.jsx";

const MAHARASHTRA_CENTER = [19.0, 77.0];

function MapFlyTo({ activeHouse }) {
  const map = useMap();

  useEffect(() => {
    if (!activeHouse) return;

    const latitude = Number(activeHouse.latitude);
    const longitude = Number(activeHouse.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    map.flyTo([latitude, longitude], 16, {
      animate: true,
      duration: 1.5,
    });
  }, [activeHouse, map]);

  return null;
}

function getHeatIntensity(house) {
  const candidates = [
    house?.solar?.generationKw,
    house?.solar?.powerKw,
    house?.solar?.currentKw,
    house?.solarGenerationKw,
    house?.powerKw,
    house?.power,
    house?.solar?.generation,
  ];

  const value = candidates.find((candidate) =>
    Number.isFinite(Number(candidate)),
  );

  if (value === undefined) return 0.35;

  // Keep the weight in a stable 0–1 range for leaflet.heat.
  return Math.max(0.15, Math.min(1, Number(value) / 10));
}

function HeatmapLayer({ households }) {
  const map = useMap();

  const heatPoints = useMemo(
    () =>
      (Array.isArray(households) ? households : [])
        .map((house) => {
          const latitude = Number(house?.latitude);
          const longitude = Number(house?.longitude);

          if (
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
          ) {
            return null;
          }

          return [latitude, longitude, getHeatIntensity(house)];
        })
        .filter(Boolean),
    [households],
  );

  useEffect(() => {
    if (!map || heatPoints.length === 0) return undefined;

    const heatLayer = L.heatLayer(heatPoints, {
      radius: 28,
      blur: 22,
      maxZoom: 12,
      max: 1,
      minOpacity: 0.28,
      gradient: {
        0.2: "#2563eb",
        0.45: "#06b6d4",
        0.7: "#facc15",
        0.9: "#f97316",
        1.0: "#dc2626",
      },
    });

    heatLayer.addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, heatPoints]);

  return null;
}

export default function GridMap({
  households = [],
  onHouseSelect,
  activeHouse,
}) {
  const safeHouseholds = Array.isArray(households) ? households : [];

  return (
    <section
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
        minZoom={6}
        maxZoom={18}
        scrollWheelZoom={true}
        preferCanvas={true}
        zoomAnimation={false}
        fadeAnimation={false}
        markerZoomAnimation={false}
        style={{
          width: "100%",
          height: "100%",
          minHeight: "540px",
          background: "#0f172a",
        }}
      >
        <MapFlyTo activeHouse={activeHouse} />
        <HeatmapLayer households={safeHouseholds} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          updateWhenZooming={false}
          updateWhenIdle={true}
          keepBuffer={1}
        />

        <MarkerClusterGroup
          chunkedLoading={true}
          chunkInterval={100}
          chunkDelay={25}
          removeOutsideVisibleBounds={true}
          maxClusterRadius={60}
          animate={false}
          spiderfyOnMaxZoom={true}
          showCoverageOnHover={false}
        >
          {safeHouseholds.map((house) => {
            const solarStatus = house?.solar?.status || "WAITING";

            return (
              <HouseholdMarker
                key={`${house.houseId}-${solarStatus}`}
                household={house}
                onSelect={onHouseSelect}
              />
            );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </section>
  );
}
