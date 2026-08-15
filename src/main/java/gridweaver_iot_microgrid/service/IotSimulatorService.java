package gridweaver_iot_microgrid.service;

import gridweaver_iot_microgrid.model.DeviceStatus;
import gridweaver_iot_microgrid.model.DeviceType;
import gridweaver_iot_microgrid.model.HouseholdLocation;
import gridweaver_iot_microgrid.model.TelemetryPayload;
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
public class IotSimulatorService {

    private final SimpMessagingTemplate messagingTemplate;
    private final double baseLat = 19.0760; // Central Mumbai Latitude
    private final double baseLng = 72.8777; // Central Mumbai Longitude

    // Holds 5,000 fixed household DTOs mapped on startup
    private final List<HouseholdLocation> households = new ArrayList<>();

    public IotSimulatorService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Initializes 5,000 fixed Household locations across Mumbai upon application startup,
     * then spawns 10,000 concurrent Virtual Threads (1 Solar + 1 Battery per Household).
     */
    @EventListener(ApplicationReadyEvent.class)
    public void start10000ConcurrentDeviceVirtualThreads() {
        Random random = new Random();

        // 1. Generate 5,000 fixed household locations centered in Mumbai
        for (int i = 0; i < 5000; i++) {
            String houseId = "HOUSE-MUM-" + (1000 + i);
            double lat = baseLat + (random.nextDouble() - 0.5) * 0.1;
            double lng = baseLng + (random.nextDouble() - 0.5) * 0.1;

            // Instantiating the clean HouseholdLocation DTO record
            households.add(new HouseholdLocation(houseId, lat, lng));
        }

        // 2. Launch 10,000 Virtual Threads using Java 21 Project Loom
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {

            for (HouseholdLocation house : households) {
                // Thread 1: Solar Panel Array for this household
                String solarId = "SOLAR-" + house.houseId();
                executor.submit(() -> runVirtualDeviceLoop(solarId, house, DeviceType.SOLAR_PANEL));

                // Thread 2: Home Battery for this household
                String batteryId = "BATT-" + house.houseId();
                executor.submit(() -> runVirtualDeviceLoop(batteryId, house, DeviceType.BATTERY));
            }

            System.out.println("🚀 [JAVA 21 VIRTUAL THREADS] Successfully spawned 10,000 concurrent tasks across 5,000 fixed Households!");
        }
    }

    private void runVirtualDeviceLoop(String deviceId, HouseholdLocation house, DeviceType deviceType) {
        Random random = new Random();

        while (!Thread.currentThread().isInterrupted()) {
            try {
                // Stagger ping intervals per device (between 1 to 3 seconds)
                Thread.sleep(5000 + random.nextInt(5000));

                TelemetryPayload payload;
                if (deviceType == DeviceType.SOLAR_PANEL) {
                    payload = new TelemetryPayload(
                            deviceId,
                            DeviceType.SOLAR_PANEL,
                            DeviceStatus.GENERATING,
                            random.nextDouble(80.0, 200.0),
                            0.0,
                            house.latitude(),  // Using Java 21 record accessor getter
                            house.longitude(), // Using Java 21 record accessor getter
                            Instant.now()
                    );
                } else {
                    payload = new TelemetryPayload(
                            deviceId,
                            DeviceType.BATTERY,
                            random.nextBoolean() ? DeviceStatus.CHARGING : DeviceStatus.DISCHARGING,
                            random.nextDouble(1500.0, 2500.0),
                            random.nextDouble(40.0, 90.0),
                            house.latitude(),  // Using Java 21 record accessor getter
                            house.longitude(), // Using Java 21 record accessor getter
                            Instant.now()
                    );
                }

                // Broadcast payload to WebSocket topic
                messagingTemplate.convertAndSend("/topic/telemetry", payload);

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
    }
}