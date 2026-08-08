package gridweaver_iot_microgrid.service;

import gridweaver_iot_microgrid.model.DeviceStatus;
import gridweaver_iot_microgrid.model.DeviceType;
import gridweaver_iot_microgrid.model.TelemetryPayload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Random;

@Service
public class IotSimulatorService {
    private final SimpMessagingTemplate messagingTemplate;
    private final Random random = new Random();

    //Coordinates centered around Mumbai gird area
    private final double baseLat = 19.0760;
    private final double baseLng = 72.8777;

    public IotSimulatorService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Scheduled(fixedRate = 1000)
    public void generateAndBroadcastTelemetry() {

        //Generate simulated Solar Panel payload
        TelemetryPayload solarPayload = new TelemetryPayload(
                "SOLAR-MUM-" + (1000 + random.nextInt(50)),
                DeviceType.SOLAR_PANEL,
                DeviceStatus.GENERATING,
                80.0 + (120.0 * random.nextDouble()),   //80W to 200W
                0.0,
                baseLat + (random.nextDouble() - 0.5) * 0.1,
                baseLng + (random.nextDouble() - 0.5) * 0.1,
                Instant.now()
        );

        //Generate simulated Battery payload
        TelemetryPayload batteryPayload = new TelemetryPayload(
                "BATT-MUM-"+ (2000 + random.nextInt(50)),
                DeviceType.BATTERY,
                random.nextBoolean() ? DeviceStatus.CHARGING : DeviceStatus.DISCHARGING,
                1500.0 + (1000.0 * random.nextDouble()),
                40.0 + (50.0 * random.nextDouble()),
                baseLat + (random.nextDouble() - 0.5) * 0.1,
                baseLng + (random.nextDouble() - 0.5) * 0.1,
                Instant.now()
        );

        //Broadcase payloads to the WebSocket topic /topic/telemetry
        messagingTemplate.convertAndSend("/topic/telemetry", solarPayload);
        messagingTemplate.convertAndSend("/topic/telemetry", batteryPayload);

        System.out.println("\uD83D\uDCE1 [VirtualThread-Broadcast] Sent telemetry pings for "
                            + solarPayload.deviceId() + " and " + batteryPayload.deviceId());
    }
}
