package gridweaver_iot_microgrid;

import gridweaver_iot_microgrid.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;

class IotSimulatorServiceTest {

    @Test
    void shouldCreateIotSimulatorService() {
        TelemetryKafkaProducer kafkaProducer = mock(TelemetryKafkaProducer.class);

        IotSimulatorService service =
                new IotSimulatorService(kafkaProducer);

        // Verify that the service is created successfully
        assertNotNull(service);
    }
}