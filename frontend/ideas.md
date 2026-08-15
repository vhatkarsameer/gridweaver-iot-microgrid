GridWeaver GIS Map Frontend — Week 1 Design & Implementation Specification

Branch: feature/week-1-map-integration
Project: GridWeaver IoT Microgrid State Engine (Mumbai Region)




1. Executive Summary & Design Direction

The objective of Shahi's Week 1 task is to build and integrate an interactive Geographical Information System (GIS) map centered on Mumbai, capable of displaying real-time or static solar and battery device nodes.

Instead of building an isolated mock application, the frontend was successfully aligned with Sameer’s existing React Vite and STOMP WebSocket architecture. This ensures seamless consumption of the backend TelemetryPayload contract without duplicating application entry points.

Design Principles & Aesthetic Choices

•
Theme: Industrial Energy Control Tower (Clean Slate / Dark Accents / High Contrast Status Indicators).

•
Typography: Geist Sans for interface typography paired with IBM Plex Mono for telemetry values, device IDs, and coordinates.

•
Color Coding: Status-driven visual hierarchy:

•
Charging / Active: Cyan (#06b6d4)

•
Discharging: Amber (#f59e0b)

•
Idle: Slate Gray (#64748b)

•
Fault: Crimson Red (#ef4444)



