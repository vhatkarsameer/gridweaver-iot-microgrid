package gridweaver_iot_microgrid.service;

import gridweaver_iot_microgrid.model.DeviceStatus;
import gridweaver_iot_microgrid.model.TelemetryPayload;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class TelemetryKafkaConsumer {

    private final GridStateEngine gridStateEngine;
    private final SimpMessagingTemplate messagingTemplate;
    private final DeviceStateProcessor stateProcessor;

    public TelemetryKafkaConsumer(GridStateEngine gridStateEngine, SimpMessagingTemplate messagingTemplate, DeviceStateProcessor stateProcessor) {
        this.gridStateEngine = gridStateEngine;
        this.messagingTemplate = messagingTemplate;
        this.stateProcessor = stateProcessor;
    }

    @KafkaListener(topics = "telemetry-events", groupId = "gridweaver-group")
    public void consumeTelemetry(TelemetryPayload payload) {

        DeviceStatus evaluatedStatus = stateProcessor.processAndGetState(payload);

        TelemetryPayload processedPayload = new TelemetryPayload(
                payload.deviceId(),
                payload.deviceType(),
                evaluatedStatus,
                payload.outputWatts(),
                payload.batteryLevelPct(),
                payload.latitude(),
                payload.longitude(),
                payload.timestamp()
        );
        gridStateEngine.ingestTelemetry(processedPayload);
        messagingTemplate.convertAndSend("/topic/telemetry", processedPayload);
    }
}
