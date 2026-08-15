package gridweaver_iot_microgrid.service;

import gridweaver_iot_microgrid.DTO.GridStateSummary;
import gridweaver_iot_microgrid.mapper.GridStateMapper;
import gridweaver_iot_microgrid.model.DeviceType;
import gridweaver_iot_microgrid.model.TelemetryPayload;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GridStateEngine {

    private final Map<String, TelemetryPayload> latestDeviceTelemetry = new ConcurrentHashMap<>();

    public void ingestTelemetry(TelemetryPayload payload) {
        if(payload != null && payload.deviceId() != null) {
            latestDeviceTelemetry.put(payload.deviceId(), payload);
        }
    }

    public GridStateSummary calculateGridSummary() {
        return GridStateMapper.toGridStateSummary(latestDeviceTelemetry.values());
    }
}
