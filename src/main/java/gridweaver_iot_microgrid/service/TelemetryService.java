package gridweaver_iot_microgrid.service;

import gridweaver_iot_microgrid.model.TelemetryPayload;
import org.springframework.stereotype.Service;

@Service
public class TelemetryService {

    private final TelemetryStateProcessor stateProcessor;
    private final TelemetryWebSocketService webSocketService;

    public TelemetryService(
            TelemetryStateProcessor stateProcessor,
            TelemetryWebSocketService webSocketService) {

        this.stateProcessor = stateProcessor;
        this.webSocketService = webSocketService;
    }

    public void processTelemetry(
            TelemetryPayload telemetry) {

        // 1. Send telemetry into the state-processing boundary.
        stateProcessor.process(telemetry);

        // 2. Broadcast telemetry to WebSocket subscribers.
        webSocketService.publishTelemetry(telemetry);
    }
}