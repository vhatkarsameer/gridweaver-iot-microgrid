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
  const { generationPoints, consumptionPoints } = useMemo(() => {
    const gen = [];
    const con = [];

    (households || []).forEach((house) => {
      const lat = Number(house.latitude);
      const lng = Number(house.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const solarOutput = Number(house.solar?.outputWatts || 0);
      const batteryOutput = Number(house.battery?.outputWatts || 0);

      const genIntensity = Math.min(1, Math.max(0.2, solarOutput / 5000));
      const conIntensity = Math.min(1, Math.max(0.2, batteryOutput / 5000));

      if (solarOutput > 0) gen.push([lat, lng, genIntensity]);
      if (batteryOutput > 0) con.push([lat, lng, conIntensity]);
    });

    return { generationPoints: gen, consumptionPoints: con };
  }, [households]);

  return (
    <section className="grid-map-shell">
      <MapContainer
        center={MAHARASHTRA_CENTER}
        zoom={9}
        minZoom={6}
        maxZoom={18}
        scrollWheelZoom={true}
        preferCanvas={true}
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
          keepBuffer={8}
        />

        {/* Generation Layer: Green to Yellow */}
        <HeatmapLayer
          points={generationPoints}
          radius={32}
          blur={24}
          gradient={{
            0.2: "#064e3b",
            0.45: "#10b981",
            0.7: "#facc15",
            1.0: "#fff7ed",
          }}
        />

        {/* Consumption Layer: Blue to Red */}
        <HeatmapLayer
          points={consumptionPoints}
          radius={28}
          blur={22}
          gradient={{
            0.2: "#172554",
            0.45: "#2563eb",
            0.7: "#f97316",
            1.0: "#dc2626",
          }}
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
                            key={house.houseId}
                            household={house}
                            onSelect={onHouseSelect}
                          />
                        );
                      })}
        </MarkerClusterGroup>
      </MapContainer>

      {/* Floating Legend */}
      <div className="map-legend">
        <strong>Data Overlays</strong>
        <span>
          <span className="legend-swatch legend-generation" /> Generation
        </span>
        <span>
          <span className="legend-swatch legend-consumption" /> Consumption
        </span>
      </div>
    </section>
  );
}