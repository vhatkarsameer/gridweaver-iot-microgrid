package com.example.GridweaverApplication.model;

import java.time.Instant;

public record TelemetryPayload(
        String deviceId,
        DeviceType deviceType,
        DeviceStatus status,
        double outputWatts,             // Power generated (Solar) or transferred (Battery)
        double batteryLevelPct,         // Battery charge % (0.0 for Solar)
        double latitude,                // Map coordinate for GIS
        double longitude,               // Map coordinate for GIS
        Instant timestamp
) {}