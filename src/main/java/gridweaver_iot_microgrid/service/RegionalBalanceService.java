package gridweaver_iot_microgrid.service;

import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class RegionalBalanceService {

    private final AuditLogService auditLogService;

    public RegionalBalanceService(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    public void balanceGrid(Map<String, Double> regionalNetPower) {
        String surplusRegion = null;
        String deficitRegion = null;
        double maxSurplus = 0;
        double maxDeficit = 0;

        for(Map.Entry<String, Double> entry : regionalNetPower.entrySet()) {
            double netPower = entry.getValue();
            if(netPower > maxSurplus) {
                maxSurplus = netPower;
                surplusRegion = entry.getKey();
            }
            else if(netPower < maxDeficit) {
                maxDeficit = netPower;
                deficitRegion = entry.getKey();
            }
        }

        if(surplusRegion != null && deficitRegion != null) {
            double powerToRoute = Math.min(maxSurplus, Math.abs(maxDeficit));
            auditLogService.logPowerRouting(surplusRegion, deficitRegion, powerToRoute);

            regionalNetPower.put(surplusRegion, regionalNetPower.get(surplusRegion) - powerToRoute);
            regionalNetPower.put(deficitRegion, regionalNetPower.get(deficitRegion) + powerToRoute);
        }
    }
}
