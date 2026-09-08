package gridweaver_iot_microgrid.service;

import gridweaver_iot_microgrid.model.TelemetryPayload;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class TelemetryKafkaProducer {

    private final KafkaTemplate<String, TelemetryPayload> kafkaTemplate;

    // The Kafka topic we will publish to
    private static final String TOPIC = "telemetry-events-v2";

    public TelemetryKafkaProducer(KafkaTemplate<String, TelemetryPayload> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    /**
     * Publishes a device's telemetry payload to the Kafka cluster.
     */
    public void publishTelemetry(TelemetryPayload payload) {
        // We use the deviceId as the Kafka Message Key to ensure
        // messages from the same device go to the same partition in order.
        kafkaTemplate.send(TOPIC, payload.deviceId(), payload);
    }
}