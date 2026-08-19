package gridweaver_iot_microgrid.service;

import gridweaver_iot_microgrid.model.TelemetryPayload;

public interface TelemetryStateProcessor {

    void process(TelemetryPayload telemetry);
}