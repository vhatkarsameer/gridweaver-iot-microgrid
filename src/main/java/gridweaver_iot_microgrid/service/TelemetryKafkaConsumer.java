package gridweaver_iot_microgrid.service;

import gridweaver_iot_microgrid.model.TelemetryPayload;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class TelemetryKafkaConsumer {

    private final GridStateEngine gridStateEngine;
    private final SimpMessagingTemplate messagingTemplate;

    public TelemetryKafkaConsumer(GridStateEngine gridStateEngine, SimpMessagingTemplate messagingTemplate) {
        this.gridStateEngine = gridStateEngine;
        this.messagingTemplate = messagingTemplate;
    }

    @KafkaListener(topics = "telemetry-events", groupId = "gridweaver-group")
    public void consumeTelemetry(TelemetryPayload payload) {
        gridStateEngine.ingestTelemetry(payload);
        messagingTemplate.convertAndSend("/topic/telemetry", payload);
    }
}
