import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import HouseholdMarker from "./HouseholdMarker.jsx";

const MAHARASHTRA_CENTER = [19.0, 77.0];

// 1. Controller component to handle the flight animation
function MapFlyTo({ activeHouse }) {
  const map = useMap();

  useEffect(() => {
    if (activeHouse) {
      // Fly to the coordinates with a smooth animation and zoom level 16
      map.flyTo([activeHouse.latitude, activeHouse.longitude], 16, {
        animate: true,
        duration: 1.5,
      });
    }
  }, [activeHouse, map]);

  return null;
}

export default function GridMap({ households, onHouseSelect, activeHouse }) {
  return (
    <section
      aria-label="Maharashtra microgrid map"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "540px",
        overflow: "hidden",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(15, 23, 42, 0.08)",
      }}
    >
      <MapContainer
        center={MAHARASHTRA_CENTER}
        zoom={7}
        minZoom={6}
        maxZoom={18}
        scrollWheelZoom={true}
        preferCanvas={true}
        style={{ width: "100%", height: "100%", minHeight: "540px" }}
      >
        {/* 2. Mount the flight controller inside the map */}
        <MapFlyTo activeHouse={activeHouse} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MarkerClusterGroup
          chunkedLoading={true}
          maxClusterRadius={60}
          animate={false}
          spiderfyOnMaxZoom={false}
        >
          {households.map((house) => (
            <HouseholdMarker
              key={house.houseId}
              household={house}
              onSelect={onHouseSelect}
            />
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </section>
  );
}