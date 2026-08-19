package gridweaver_iot_microgrid.service;

import gridweaver_iot_microgrid.model.TelemetryPayload;
import org.springframework.stereotype.Service;

@Service
public class TelemetryStateProcessorImpl
        implements TelemetryStateProcessor {

    @Override
    public void process(TelemetryPayload telemetry) {

        /*
         * Week 1:
         * Telemetry successfully reaches the state-processing boundary.
         *
         * Week 2:
         * State-machine transition logic will be implemented here.
         */

        System.out.println(
                "Telemetry received by state processor: "
                        + telemetry
        );
    }
}