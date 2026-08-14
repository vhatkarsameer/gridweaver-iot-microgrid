package gridweaver_iot_microgrid.model;

public record HouseholdLocation(
        String houseId,
        double latitude,
        double longitude
) {}
