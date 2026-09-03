package gridweaver_iot_microgrid.service;

import gridweaver_iot_microgrid.DTO.GridStateSummary;
import gridweaver_iot_microgrid.mapper.GridStateMapper;
import gridweaver_iot_microgrid.model.DeviceType;
import gridweaver_iot_microgrid.model.TelemetryPayload;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class GridStateEngine {

    private final Map<String, TelemetryPayload> latestDeviceTelemetry = new ConcurrentHashMap<>();

    public void ingestTelemetry(TelemetryPayload payload) {
        if(payload != null && payload.deviceId() != null) {
            latestDeviceTelemetry.put(payload.deviceId(), payload);
        }
    }

    public double getCurrentGridLoadPercentage() {
        double totalGen = latestDeviceTelemetry.values().stream()
                .filter(p -> p.deviceType() == DeviceType.SOLAR_PANEL)
                .mapToDouble(TelemetryPayload::outputWatts).sum();
        double totalDemand = latestDeviceTelemetry.values().stream()
                .filter(p -> p.deviceType() == DeviceType.BATTERY)
                .mapToDouble(TelemetryPayload::outputWatts).sum();

        if (totalGen == 0) return 100.0; // Max load if no generation
        return (totalDemand / totalGen) * 100.0;
    }

    public Map<String, Double> getRegionalNetPowerMap() {
        return latestDeviceTelemetry.values().stream()
                .collect(Collectors.groupingBy(
                        // Split regions dynamically by latitude
                        payload -> payload.latitude() >= 19.0 ? "Region-North" : "Region-South",
                        Collectors.summingDouble(payload ->
                                payload.deviceType() == DeviceType.SOLAR_PANEL
                                        ? payload.outputWatts() // Solar adds to grid
                                        : -payload.outputWatts() // Batteries draw from grid
                        )
                ));
    }

    public GridStateSummary calculateGridSummary() {
        double engineLoad = getCurrentGridLoadPercentage();
        return GridStateMapper.toGridStateSummary(latestDeviceTelemetry.values(), engineLoad);
    }
}
