package gridweaver_iot_microgrid.model;

public record RegionalPowerSummary(
        double totalGenerationKw,
        double totalConsumptionKw,
        double netPowerKw
) {
    public boolean isDeficit() {
        return netPowerKw < 0;
    }
}
