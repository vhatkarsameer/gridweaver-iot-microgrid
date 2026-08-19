package gridweaver_iot_microgrid;

import gridweaver_iot_microgrid.model.DeviceStatus;
import gridweaver_iot_microgrid.model.DeviceType;
import gridweaver_iot_microgrid.model.TelemetryPayload;
import gridweaver_iot_microgrid.service.TelemetryService;
import gridweaver_iot_microgrid.service.TelemetryStateProcessor;
import gridweaver_iot_microgrid.service.TelemetryWebSocketService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class TelemetryStateProcessorIntegrationTest {

    @Mock
    private TelemetryStateProcessor stateProcessor;

    @Mock
    private TelemetryWebSocketService webSocketService;

    @Test
    void shouldSendTelemetryToStateProcessingBoundary() {

        // ==================================================
        // 1. Create TelemetryService with mocked boundaries
        // ==================================================

        TelemetryService telemetryService =
                new TelemetryService(
                        stateProcessor,
                        webSocketService
                );

        // ==================================================
        // 2. Create test telemetry
        // ==================================================

        Instant timestamp = Instant.now();

        TelemetryPayload telemetry =
                new TelemetryPayload(
                        "TEST-SOLAR-001",
                        DeviceType.SOLAR_PANEL,
                        DeviceStatus.GENERATING,
                        150.0,
                        0.0,
                        19.0760,
                        72.8777,
                        timestamp
                );

        // ==================================================
        // 3. Process telemetry
        // ==================================================

        telemetryService.processTelemetry(
                telemetry
        );

        // ==================================================
        // 4. Verify telemetry reached state processor
        // ==================================================

        ArgumentCaptor<TelemetryPayload> captor =
                ArgumentCaptor.forClass(
                        TelemetryPayload.class
                );

        verify(stateProcessor)
                .process(captor.capture());

        TelemetryPayload processedTelemetry =
                captor.getValue();

        // ==================================================
        // 5. Verify exact telemetry reached the boundary
        // ==================================================

        assertEquals(
                telemetry.deviceId(),
                processedTelemetry.deviceId()
        );

        assertEquals(
                telemetry.deviceType(),
                processedTelemetry.deviceType()
        );

        assertEquals(
                telemetry.status(),
                processedTelemetry.status()
        );

        assertEquals(
                telemetry.outputWatts(),
                processedTelemetry.outputWatts()
        );

        assertEquals(
                telemetry.batteryLevelPct(),
                processedTelemetry.batteryLevelPct()
        );

        assertEquals(
                telemetry.latitude(),
                processedTelemetry.latitude()
        );

        assertEquals(
                telemetry.longitude(),
                processedTelemetry.longitude()
        );

        assertEquals(
                telemetry.timestamp(),
                processedTelemetry.timestamp()
        );
    }
}