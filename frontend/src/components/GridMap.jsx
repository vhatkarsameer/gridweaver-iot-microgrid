import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import HouseholdMarker from "./HouseholdMarker.jsx";

const MAHARASHTRA_CENTER = [19.0, 77.0];

function MapFlyTo({ activeHouse }) {
  const map = useMap();
  useEffect(() => {
    if (activeHouse) {
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
      style={{
        position: "relative", width: "100%", height: "100%",
        minHeight: "540px", overflow: "hidden"
      }}
    >
      <MapContainer
        center={MAHARASHTRA_CENTER}
        zoom={7}
        minZoom={6}
        maxZoom={18}
        scrollWheelZoom={true}
        preferCanvas={true}
        style={{ width: "100%", height: "100%", minHeight: "540px", background: "#0f172a" }}
      >
        <MapFlyTo activeHouse={activeHouse} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Clustering is back, but animations remain disabled for screen recording stability */}
        <MarkerClusterGroup
          chunkedLoading={true}
          maxClusterRadius={60}
          animate={false}
          spiderfyOnMaxZoom={true}
        >
          {households.map((house) => {
            // Bind the key to the status so Leaflet is forced to redraw the icon when it transitions
            const solarStatus = house.solar?.status || "WAITING";

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