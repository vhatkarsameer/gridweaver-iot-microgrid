package gridweaver_iot_microgrid.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private static final Logger auditLogger = LoggerFactory.getLogger("GRID_AUDIT");

    private void logStateTransition(String deviceId, String oldState, String newState) {
        auditLogger.info("STATE_CHANGE | Device: {} | Transition: {} -> {}", deviceId, oldState, newState);
    }

    public void logHardwareFault(String deviceId, String faultReason) {
        auditLogger.error("CRITICAL FAULT | Device: {} | Reason: {}", deviceId, faultReason);
    }

    public void logPowerRouting(String sourceRegion, String targetRegion, double powerRoutedKw) {
        auditLogger.info("POWER_ROUTE | Source Region: {} | Target Region: {} | Amount: {} kW", sourceRegion, targetRegion, powerRoutedKw);

    }
}
