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
@ConditionalOnProperty(name = "iot.simulator.enabled", havingValue = "true", matchIfMissing = true)
public class IotSimulatorService {

    private final SimpMessagingTemplate messagingTemplate;
    private final GridStateEngine gridStateEngine;
    private final DeviceStateProcessor stateProcessor;

    private final List<HouseholdLocation> households = new ArrayList<>();

    // Maintain a reference to the executor so Spring can shut it down gracefully
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public IotSimulatorService(SimpMessagingTemplate messagingTemplate, GridStateEngine gridStateEngine, DeviceStateProcessor stateProcessor) {
        this.messagingTemplate = messagingTemplate;
        this.gridStateEngine = gridStateEngine;
        this.stateProcessor = stateProcessor;
    }


    @EventListener(ApplicationReadyEvent.class)
    public void startConcurrentDeviceVirtualThreads() {
        Random random = new Random();

        for (int i = 0; i < 25000; i++) {
            String houseId = "HOUSE-MH-" + (1000 + i);
            double lat = 17.0 + (21.0 - 17.0) * random.nextDouble();
            double lng = 74.0 + (80.0 - 74.0) * random.nextDouble();

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

        System.out.println("🚀 [JAVA 21 VIRTUAL THREADS] Successfully spawned 50,000 concurrent tasks across 25,000 fixed Households!");
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

                DeviceStatus trueStatus = stateProcessor.processAndGetState(payload);

                TelemetryPayload finalPayload = new TelemetryPayload(
                        payload.deviceId(),
                        payload.deviceType(),
                        trueStatus,
                        payload.outputWatts(),
                        payload.batteryLevelPct(),
                        payload.latitude(),
                        payload.longitude(),
                        payload.timestamp()
                );

                gridStateEngine.ingestTelemetry(payload);

                // Broadcast payload to WebSocket topic
                messagingTemplate.convertAndSend("/topic/telemetry", finalPayload);

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