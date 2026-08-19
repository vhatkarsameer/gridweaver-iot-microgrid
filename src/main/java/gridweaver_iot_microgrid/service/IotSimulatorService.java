package gridweaver_iot_microgrid.service;

import gridweaver_iot_microgrid.model.DeviceStatus;
import gridweaver_iot_microgrid.model.DeviceType;
import gridweaver_iot_microgrid.model.HouseholdLocation;
import gridweaver_iot_microgrid.model.TelemetryPayload;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class IotSimulatorService {

    private final TelemetryService telemetryService;

    private final double baseLat = 19.0760;
    private final double baseLng = 72.8777;

    @Value("${iot.simulator.enabled:true}")
    private boolean simulatorEnabled;

    private final List<HouseholdLocation> households =
            new ArrayList<>();

    private final ExecutorService executor =
            Executors.newVirtualThreadPerTaskExecutor();

    public IotSimulatorService(
            TelemetryService telemetryService
    ) {
        this.telemetryService = telemetryService;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void start10000ConcurrentDeviceVirtualThreads() {

        if (!simulatorEnabled) {

            System.out.println(
                    "🧪 [TEST MODE] IoT simulator disabled."
            );

            return;
        }

        System.out.println(
                "🚀 [IOT SIMULATOR] Starting simulator..."
        );

        Random random = new Random();

        // ---------------------------------------------------------
        // 1. Generate 5,000 households
        // ---------------------------------------------------------

        for (int i = 0; i < 5000; i++) {

            String houseId =
                    "HOUSE-MUM-" + (1000 + i);

            double lat =
                    baseLat
                            + (random.nextDouble() - 0.5)
                            * 0.1;

            double lng =
                    baseLng
                            + (random.nextDouble() - 0.5)
                            * 0.1;

            households.add(
                    new HouseholdLocation(
                            houseId,
                            lat,
                            lng
                    )
            );
        }

        // ---------------------------------------------------------
        // 2. Start 10,000 virtual device tasks
        // ---------------------------------------------------------

        for (HouseholdLocation house : households) {

            String solarId =
                    "SOLAR-" + house.houseId();

            executor.submit(
                    () -> runVirtualDeviceLoop(
                            solarId,
                            house,
                            DeviceType.SOLAR_PANEL
                    )
            );

            String batteryId =
                    "BATT-" + house.houseId();

            executor.submit(
                    () -> runVirtualDeviceLoop(
                            batteryId,
                            house,
                            DeviceType.BATTERY
                    )
            );
        }

        System.out.println(
                "🚀 [JAVA 21 VIRTUAL THREADS] "
                        + "Successfully spawned 10,000 concurrent "
                        + "tasks across 5,000 fixed Households!"
        );
    }

    private void runVirtualDeviceLoop(
            String deviceId,
            HouseholdLocation house,
            DeviceType deviceType
    ) {

        Random random = new Random();

        while (!Thread.currentThread().isInterrupted()) {

            try {

                Thread.sleep(
                        5000 + random.nextInt(5000)
                );

                TelemetryPayload payload;

                if (deviceType == DeviceType.SOLAR_PANEL) {

                    payload =
                            new TelemetryPayload(
                                    deviceId,
                                    DeviceType.SOLAR_PANEL,
                                    DeviceStatus.GENERATING,
                                    random.nextDouble(
                                            80.0,
                                            200.0
                                    ),
                                    0.0,
                                    house.latitude(),
                                    house.longitude(),
                                    Instant.now()
                            );

                } else {

                    payload =
                            new TelemetryPayload(
                                    deviceId,
                                    DeviceType.BATTERY,
                                    random.nextBoolean()
                                            ? DeviceStatus.CHARGING
                                            : DeviceStatus.DISCHARGING,
                                    random.nextDouble(
                                            1500.0,
                                            2500.0
                                    ),
                                    random.nextDouble(
                                            40.0,
                                            90.0
                                    ),
                                    house.latitude(),
                                    house.longitude(),
                                    Instant.now()
                            );
                }

                // -------------------------------------------------
                // Send telemetry into the backend pipeline.
                // Do NOT publish directly to WebSocket here.
                // -------------------------------------------------

                telemetryService.processTelemetry(payload);

            } catch (InterruptedException e) {

                Thread.currentThread().interrupt();
                break;
            }
        }
    }

    @jakarta.annotation.PreDestroy
    public void shutdown() {

        System.out.println(
                "🛑 [IOT SIMULATOR] Shutting down..."
        );

        executor.shutdownNow();
    }
}