import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import HouseholdMarker from "./HouseholdMarker.jsx";

const MAHARASHTRA_CENTER = [19.0, 77.0];

function MapFlyTo({ activeHouse }) {
  const map = useMap();

  useEffect(() => {
    if (!activeHouse) return;

    map.flyTo(
      [activeHouse.latitude, activeHouse.longitude],
      16,
      {
        animate: true,
        duration: 1.5,
      }
    );
  }, [activeHouse, map]);

  return null;
}

function HeatmapLayer({ households }) {
  const map = useMap();

  const heatPoints = useMemo(() => {
    return households
      .filter(
        (house) =>
          Number.isFinite(house.latitude) &&
          Number.isFinite(house.longitude)
      )
      .map((house) => {
        const solarOutput = house.solar?.outputWatts || 0;
        const batteryOutput = house.battery?.outputWatts || 0;

        const totalPower = solarOutput + batteryOutput;

        const intensity = Math.min(
          1,
          Math.max(0.2, totalPower / 5000)
        );

        return [
          house.latitude,
          house.longitude,
          intensity,
        ];
      });
  }, [households]);

  useEffect(() => {
    if (!map || heatPoints.length === 0) {
      return undefined;
    }

    const heatLayer = L.heatLayer(heatPoints, {
      radius: 30,
      blur: 24,
      maxZoom: 12,
      minOpacity: 0.35,
      max: 0.9,
      gradient: {
        0.2: "#2563eb",
        0.4: "#06b6d4",
        0.6: "#22c55e",
        0.8: "#facc15",
        1.0: "#ef4444",
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
  households,
  onHouseSelect,
  activeHouse,
}) {
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

        <HeatmapLayer households={households} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MarkerClusterGroup
          chunkedLoading={true}
          maxClusterRadius={60}
          animate={false}
          spiderfyOnMaxZoom={true}
        >
          {households.map((house ) => {
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
