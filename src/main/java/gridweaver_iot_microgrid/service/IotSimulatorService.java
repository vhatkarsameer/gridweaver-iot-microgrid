package gridweaver_iot_microgrid.service;

import gridweaver_iot_microgrid.model.DeviceStatus;
import gridweaver_iot_microgrid.model.DeviceType;
import gridweaver_iot_microgrid.model.HouseholdLocation;
import gridweaver_iot_microgrid.model.TelemetryPayload;
import jakarta.annotation.PreDestroy;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
// Allow disabling the 10,000 thread simulator in test profiles if needed
@ConditionalOnProperty(name = "iot.simulator.enabled", havingValue = "true", matchIfMissing = true)
public class IotSimulatorService {

    private final SimpMessagingTemplate messagingTemplate;
    private final double baseLat = 19.0760;
    private final double baseLng = 72.8777;

    private final List<HouseholdLocation> households = new ArrayList<>();

    // Maintain a reference to the executor so Spring can shut it down gracefully
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public IotSimulatorService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void start10000ConcurrentDeviceVirtualThreads() {
        Random random = new Random();

        for (int i = 0; i < 5000; i++) {
            String houseId = "HOUSE-MUM-" + (1000 + i);
            double lat = baseLat + (random.nextDouble() - 0.5) * 0.1;
            double lng = baseLng + (random.nextDouble() - 0.5) * 0.1;

            households.add(new HouseholdLocation(houseId, lat, lng));
        }

        // Do NOT put Executors.newVirtualThreadPerTaskExecutor() in a try-with-resources block!
        // Submit tasks directly to allow the startup event thread to unblock.
        for (HouseholdLocation house : households) {
            String solarId = "SOLAR-" + house.houseId();
            executor.submit(() -> runVirtualDeviceLoop(solarId, house, DeviceType.SOLAR_PANEL));

            String batteryId = "BATT-" + house.houseId();
            executor.submit(() -> runVirtualDeviceLoop(batteryId, house, DeviceType.BATTERY));
        }

        System.out.println("🚀 [JAVA 21 VIRTUAL THREADS] Successfully spawned 10,000 concurrent tasks across 5,000 fixed Households!");
    }

    private void runVirtualDeviceLoop(String deviceId, HouseholdLocation house, DeviceType deviceType) {
        Random random = new Random();

        while (!Thread.currentThread().isInterrupted()) {
            try {
                Thread.sleep(5000 + random.nextInt(5000));

                TelemetryPayload payload;
                if (deviceType == DeviceType.SOLAR_PANEL) {
                    payload = new TelemetryPayload(
                            deviceId,
                            DeviceType.SOLAR_PANEL,
                            DeviceStatus.GENERATING,
                            random.nextDouble(80.0, 200.0),
                            0.0,
                            house.latitude(),
                            house.longitude(),
                            Instant.now()
                    );
                } else {
                    payload = new TelemetryPayload(
                            deviceId,
                            DeviceType.BATTERY,
                            random.nextBoolean() ? DeviceStatus.CHARGING : DeviceStatus.DISCHARGING,
                            random.nextDouble(1500.0, 2500.0),
                            random.nextDouble(40.0, 90.0),
                            house.latitude(),
                            house.longitude(),
                            Instant.now()
                    );
                }

                messagingTemplate.convertAndSend("/topic/telemetry", payload);

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }

    // Gracefully shut down all 10,000 threads when Spring context closes or tests finish
    @PreDestroy
    public void stopSimulation() {
        executor.shutdownNow();
    }
}