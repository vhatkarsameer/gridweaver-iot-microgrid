package gridweaver_iot_microgrid;

import gridweaver_iot_microgrid.model.HouseholdLocation;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class HouseholdLocationTest {

    @Test
    void shouldCreateHouseholdLocation() {
        HouseholdLocation location = new HouseholdLocation(
                "HOUSE-MUM-1000",
                19.0760,
                72.8777
        );

        assertEquals("HOUSE-MUM-1000", location.houseId());
        assertEquals(19.0760, location.latitude());
        assertEquals(72.8777, location.longitude());
    }

    @Test
    void shouldSupportEqualHouseholdLocations() {
        HouseholdLocation first = new HouseholdLocation(
                "HOUSE-MUM-1000",
                19.0760,
                72.8777
        );

        HouseholdLocation second = new HouseholdLocation(
                "HOUSE-MUM-1000",
                19.0760,
                72.8777
        );

        assertEquals(first, second);
    }
}