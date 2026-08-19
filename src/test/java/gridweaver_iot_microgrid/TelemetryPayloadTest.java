package gridweaver_iot_microgrid;

import gridweaver_iot_microgrid.model.DeviceStatus;
import gridweaver_iot_microgrid.model.DeviceType;
import gridweaver_iot_microgrid.model.TelemetryPayload;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class TelemetryPayloadTest {

    @Test
    void shouldCreateSolarTelemetryPayload() {
        Instant timestamp = Instant.now();

        TelemetryPayload payload = new TelemetryPayload(
                "SOLAR-HOUSE-MUM-1000",
                DeviceType.SOLAR_PANEL,
                DeviceStatus.GENERATING,
                150.0,
                0.0,
                19.0760,
                72.8777,
                timestamp
        );

        assertEquals("SOLAR-HOUSE-MUM-1000", payload.deviceId());
        assertEquals(DeviceType.SOLAR_PANEL, payload.deviceType());
        assertEquals(DeviceStatus.GENERATING, payload.status());
        assertEquals(150.0, payload.outputWatts());
        assertEquals(0.0, payload.batteryLevelPct());
        assertEquals(19.0760, payload.latitude());
        assertEquals(72.8777, payload.longitude());
        assertEquals(timestamp, payload.timestamp());
    }

    @Test
    void shouldCreateBatteryTelemetryPayload() {
        Instant timestamp = Instant.now();

        TelemetryPayload payload = new TelemetryPayload(
                "BATT-HOUSE-MUM-1000",
                DeviceType.BATTERY,
                DeviceStatus.CHARGING,
                2000.0,
                75.0,
                19.0760,
                72.8777,
                timestamp
        );

        assertEquals("BATT-HOUSE-MUM-1000", payload.deviceId());
        assertEquals(DeviceType.BATTERY, payload.deviceType());
        assertEquals(DeviceStatus.CHARGING, payload.status());
        assertEquals(2000.0, payload.outputWatts());
        assertEquals(75.0, payload.batteryLevelPct());
        assertEquals(19.0760, payload.latitude());
        assertEquals(72.8777, payload.longitude());
        assertEquals(timestamp, payload.timestamp());
    }
}