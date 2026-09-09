import { useMemo, useState } from "react";
import "./dashboard.css";

const REGIONS = [
  { id: "north", name: "North", detail: "Generation reserve", x: 142, y: 82, color: "#4ee3a0", ratio: 0.24 },
  { id: "west", name: "West", detail: "Solar corridor", x: 75, y: 220, color: "#55b9ff", ratio: 0.18 },
  { id: "central", name: "Central", detail: "Demand hub", x: 270, y: 176, color: "#f2c55c", ratio: 0.30 },
  { id: "east", name: "East", detail: "Grid storage", x: 472, y: 116, color: "#b98cff", ratio: 0.16 },
  { id: "south", name: "South", detail: "Solar field", x: 382, y: 282, color: "#ff8c70", ratio: 0.12 },
];
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export default function PowerFlow({ gridSummary, households = [] }) {
  const [selectedId, setSelectedId] = useState("central");
  const selected = REGIONS.find((node) => node.id === selectedId) || REGIONS[2];
  const totalSolar = number(gridSummary?.totalSolarGenerationKw, households.reduce((sum, h) => sum + number(h.solar?.outputWatts) / 1000, 0));
  const totalBattery = number(gridSummary?.totalBatteryDemandKw, households.reduce((sum, h) => sum + number(h.battery?.outputWatts) / 1000, 0));
  const netBalance = number(gridSummary?.netGridBalanceKw, totalSolar - totalBattery);
  const liveNodes = useMemo(() => REGIONS.map((node) => ({ ...node, value: `${(Math.abs(netBalance || totalSolar || totalBattery) * node.ratio).toFixed(2)} kW` })), [netBalance, totalSolar, totalBattery]);
  const liveSelected = liveNodes.find((node) => node.id === selected.id) || liveNodes[2];
  return <section className="dashboard-panel dashboard-flow-panel" aria-label="Regional power flow">
    <div className="dashboard-panel-heading"><div><h2>Regional power flow</h2><p>Live grid summary · {households.length} devices</p></div><span className="dashboard-live-label"><i /> STREAMING</span></div>
    <div className="dashboard-map-wrap">
      <div className="dashboard-map-status"><i /> LIVE POWER FLOW <span>{netBalance.toFixed(1)} kW net balance</span></div>
      <svg className="dashboard-flow-map" viewBox="0 0 550 350" role="img" aria-label="Live regional grid power flow">
        <defs><pattern id="dashboard-grid-dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#29415c" /></pattern></defs>
        <rect width="550" height="350" fill="url(#dashboard-grid-dots)" />
        <path className="dashboard-route" d="M142 82 C200 102 214 145 270 176 S410 160 472 116" /><path className="dashboard-route" d="M75 220 C148 208 192 179 270 176 S330 247 382 282" /><path className="dashboard-flow-line" d="M142 82 C200 102 214 145 270 176 S410 160 472 116" /><path className="dashboard-flow-line blue" d="M75 220 C148 208 192 179 270 176 S330 247 382 282" />
        {liveNodes.map((node) => <g className={`dashboard-grid-node ${selected.id === node.id ? "selected" : ""}`} key={node.id} transform={`translate(${node.x} ${node.y})`} onClick={() => setSelectedId(node.id)} tabIndex="0" role="button" aria-label={`Select ${node.name} region`}><circle r="18" fill="#0d1b2c" stroke={node.color} strokeWidth="2" /><circle r="5" fill={node.color} /><text y="34" textAnchor="middle">{node.name}</text><text y="49" textAnchor="middle" className="value">{node.value}</text></g>)}
      </svg>
    </div>
    <div className="dashboard-selected-region"><span style={{ background: selected.color }} /><div><small>SELECTED REGION</small><b>{selected.name} <em>{selected.detail}</em></b></div><strong>{liveSelected.value}</strong><div className="dashboard-health"><small>NET BALANCE</small><b>{netBalance.toFixed(1)} kW</b></div></div>
  </section>;
}
