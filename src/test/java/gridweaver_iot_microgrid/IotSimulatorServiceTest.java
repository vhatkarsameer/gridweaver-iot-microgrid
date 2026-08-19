package gridweaver_iot_microgrid;

import gridweaver_iot_microgrid.service.IotSimulatorService;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;

class IotSimulatorServiceTest {

    @Test
    void shouldCreateIotSimulatorService() {
        // Mock the existing WebSocket messaging dependency
        SimpMessagingTemplate messagingTemplate =
                mock(SimpMessagingTemplate.class);

        // Create the simulator service using its existing constructor
        IotSimulatorService service =
                new IotSimulatorService(messagingTemplate);

        // Verify that the service is created successfully
        assertNotNull(service);
    }
}