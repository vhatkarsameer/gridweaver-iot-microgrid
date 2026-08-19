package gridweaver_iot_microgrid.service;

import gridweaver_iot_microgrid.model.TelemetryPayload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class TelemetryWebSocketService {

    private static final String TELEMETRY_TOPIC =
            "/topic/telemetry";

    private final SimpMessagingTemplate messagingTemplate;

    public TelemetryWebSocketService(
            SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void publishTelemetry(
            TelemetryPayload telemetry) {

        System.out.println(
                "Publishing telemetry to WebSocket: "
                        + telemetry
        );

        messagingTemplate.convertAndSend(
                TELEMETRY_TOPIC,
                telemetry
        );
    }
}