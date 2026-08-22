package gridweaver_iot_microgrid.DTO;

import java.time.Instant;

public record GridStateSummary(
        Instant timestamp,
        int totalHouseholds,
        int activeDevices,
        double totalSolarGenerationKw,
        double totalBatteryDemandKw,
        double netGridBalanceKw,
        double averageBatterySocPercentage

) { }