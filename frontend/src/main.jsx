import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./index.css";
import App from "./App.jsx";

window.L = L;

async function startApplication() {
  await import("leaflet.heat");

  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

startApplication();
