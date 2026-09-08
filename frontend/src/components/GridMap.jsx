import { useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import HouseholdMarker from "./HouseholdMarker.jsx";


const MAHARASHTRA_CENTER = [19.0, 77.0];

function MapFlyTo({ activeHouse }) {
  const map = useMap();

  useEffect(() => {
    if (!activeHouse) return;

    map.flyTo([activeHouse.latitude, activeHouse.longitude], 16, {
      animate: true,
      duration: 1.5,
    });
  }, [activeHouse, map]);

  return null;
}

// Generic HeatmapLayer that accepts specific points and a gradient
function HeatmapLayer({ points, gradient, radius = 30, blur = 24 }) {
  const map = useMap();

  useEffect(() => {
    if (!points || points.length === 0) return undefined;

    const heatLayer = L.heatLayer(points, {
      radius,
      blur,
      maxZoom: 12,
      minOpacity: 0.35,
      max: 0.9,
      gradient,
    });

    heatLayer.addTo(map);
    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, gradient, radius, blur]);

  return null;
}

export default function GridMap({ households, onHouseSelect, activeHouse }) {
  // Split the data into two separate arrays for dual-layer rendering
  const { generationPoints, consumptionPoints } = useMemo(() => {
    const gen = [];
    const con = [];

    (households || []).forEach((house) => {
      if (!Number.isFinite(Number(house.latitude)) || !Number.isFinite(Number(house.longitude))) return;

      const solarOutput = Number(house.solar?.outputWatts || 0);
      const batteryOutput = Number(house.battery?.outputWatts || 0);

      // Keep intensity bounded between 0.2 and 1.0 for visibility
      const genIntensity = Math.min(1, Math.max(0.2, solarOutput / 5000));
      const conIntensity = Math.min(1, Math.max(0.2, batteryOutput / 5000));

      if (solarOutput > 0) gen.push([Number(house.latitude), Number(house.longitude), genIntensity]);
      if (batteryOutput > 0) con.push([Number(house.latitude), Number(house.longitude), conIntensity]);
    });

    return { generationPoints: gen, consumptionPoints: con };
  }, [households]);

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
        />

        {/* Layer 1: Solar Generation (Green to Yellow) */}
        <HeatmapLayer
          points={generationPoints}
          gradient={{ 0.2: "#064e3b", 0.45: "#10b981", 0.7: "#facc15", 1: "#fff7ed" }}
        />

        {/* Layer 2: Battery Consumption (Blue to Red) */}
        <HeatmapLayer
          points={consumptionPoints}
          gradient={{ 0.2: "#172554", 0.45: "#2563eb", 0.7: "#f97316", 1: "#dc2626" }}
        />

        <MarkerClusterGroup
          chunkedLoading={true}
          maxClusterRadius={60}
          animate={false}
          spiderfyOnMaxZoom={true}
        >
          {(households || []).map((house) => {
            const solarStatus = house.solar?.status || "WAITING";
            const batteryStatus = house.battery?.status || "WAITING";
            return (
              <HouseholdMarker
                key={`${house.houseId}-${solarStatus}-${batteryStatus}`}
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