package gridweaver_iot_microgrid;

import gridweaver_iot_microgrid.service.DeviceStateProcessor;
import gridweaver_iot_microgrid.service.GridStateEngine;
import gridweaver_iot_microgrid.service.IotSimulatorService;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;

class IotSimulatorServiceTest {

    @Test
    void shouldCreateIotSimulatorService() {
        // 1. Mock the WebSocket messaging dependency
        SimpMessagingTemplate messagingTemplate = mock(SimpMessagingTemplate.class);

        // 2. Mock your new Week 2 State Engine dependencies
        GridStateEngine gridStateEngine = mock(GridStateEngine.class);
        DeviceStateProcessor stateProcessor = mock(DeviceStateProcessor.class);

        // 3. Create the simulator service using the updated constructor
        IotSimulatorService service =
                new IotSimulatorService(messagingTemplate, gridStateEngine, stateProcessor);

        // Verify that the service is created successfully
        assertNotNull(service);
    }
}