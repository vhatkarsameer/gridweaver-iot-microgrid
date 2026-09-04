import { useState } from "react";
import "./week4-dashboard.css";

const NODES = [
  { id: "north", name: "North", value: "1.42 GW", detail: "Hydro reserve", x: 142, y: 82, color: "#4ee3a0" },
  { id: "west", name: "West", value: "0.86 GW", detail: "Wind corridor", x: 75, y: 220, color: "#55b9ff" },
  { id: "central", name: "Central", value: "2.18 GW", detail: "Demand hub", x: 270, y: 176, color: "#f2c55c" },
  { id: "east", name: "East", value: "1.16 GW", detail: "Grid storage", x: 472, y: 116, color: "#b98cff" },
  { id: "south", name: "South", value: "0.74 GW", detail: "Solar field", x: 382, y: 282, color: "#ff8c70" },
];

export default function Week4PowerFlow({ onRegionSelect }) {
  const [selectedId, setSelectedId] = useState("central");
  const selected = NODES.find((node) => node.id === selectedId);
  const selectNode = (node) => { setSelectedId(node.id); onRegionSelect?.(node); };

  return <section className="week4-panel week4-flow-panel" aria-label="Regional power flow">
    <div className="week4-panel-heading"><div><h2>Regional power flow</h2><p>Distributed grid topology · 5 active regions</p></div><span className="week4-live-label"><i /> STREAMING</span></div>
    <div className="week4-map-wrap">
      <div className="week4-map-status"><i /> LIVE POWER FLOW <span>Updated just now</span></div>
      <svg className="week4-flow-map" viewBox="0 0 550 350" role="img" aria-label="Animated regional grid power flow">
        <defs><pattern id="week4-grid-dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#29415c" /></pattern></defs>
        <rect width="550" height="350" fill="url(#week4-grid-dots)" />
        <path className="week4-route" d="M142 82 C200 102 214 145 270 176 S410 160 472 116" /><path className="week4-route" d="M75 220 C148 208 192 179 270 176 S330 247 382 282" /><path className="week4-flow-line" d="M142 82 C200 102 214 145 270 176 S410 160 472 116" /><path className="week4-flow-line blue" d="M75 220 C148 208 192 179 270 176 S330 247 382 282" />
        {NODES.map((node) => <g className={`week4-grid-node ${selectedId === node.id ? "selected" : ""}`} key={node.id} transform={`translate(${node.x} ${node.y})`} onClick={() => selectNode(node)}><circle r="18" fill="#0d1b2c" stroke={node.color} strokeWidth="2" /><circle r="5" fill={node.color} /><text y="34" textAnchor="middle">{node.name}</text><text y="49" textAnchor="middle" className="value">{node.value}</text></g>)}
      </svg>
    </div>
    <div className="week4-selected-region"><span style={{ background: selected.color }} /><div><small>SELECTED REGION</small><b>{selected.name} <em>{selected.detail}</em></b></div><strong>{selected.value}</strong><div className="week4-health"><small>Health</small><b>98.4%</b></div></div>
  </section>;
}
