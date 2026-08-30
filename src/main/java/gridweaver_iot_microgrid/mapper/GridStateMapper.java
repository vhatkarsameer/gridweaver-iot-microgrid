package gridweaver_iot_microgrid.mapper;

import gridweaver_iot_microgrid.DTO.GridStateSummary;
import gridweaver_iot_microgrid.model.DeviceType;
import gridweaver_iot_microgrid.model.TelemetryPayload;

import java.time.Instant;
import java.util.Collection;

public class GridStateMapper {

    public static GridStateSummary toGridStateSummary(Collection<TelemetryPayload> payloads) {

        if(payloads == null || payloads.isEmpty()) {
            return new GridStateSummary(Instant.now(), 0, 0, 0.0, 0.0, 0.0, 0.0);
        }

        int activeDevices = payloads.size();
        int totalHouseholdsDevices = activeDevices/2;

        double totalSolarWatts = payloads.stream()
                .filter(d -> d.deviceType() == DeviceType.SOLAR_PANEL)
                .mapToDouble(TelemetryPayload::outputWatts)
                .sum();

        double totalBatteryWatts = payloads.stream()
                .filter(d -> d.deviceType() == DeviceType.BATTERY)
                .mapToDouble(TelemetryPayload::outputWatts)
                .sum();

        double averageBatteryLevelPct = payloads.stream()
                .filter(d -> d.deviceType() == DeviceType.BATTERY)
                .mapToDouble(TelemetryPayload::batteryLevelPct)
                .average()
                .orElse(0.0);

        double netBalanceWatts = totalSolarWatts + totalBatteryWatts;

        return new GridStateSummary(
                Instant.now(),
                totalHouseholdsDevices,
                activeDevices,
                round(totalSolarWatts / 1000.0),   // Converted to kW
                round(totalBatteryWatts / 1000.0), // Converted to kW
                round(netBalanceWatts / 1000.0),   // Converted to kW
                round(averageBatteryLevelPct)
        );
    }

    private static double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
