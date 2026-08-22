package gridweaver_iot_microgrid;

import gridweaver_iot_microgrid.model.DeviceType;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DeviceTypeTest {

    @Test
    void shouldContainExpectedDeviceTypes() {
        assertEquals(2, DeviceType.values().length);

        assertTrue(java.util.Arrays.asList(DeviceType.values())
                .contains(DeviceType.SOLAR_PANEL));

        assertTrue(java.util.Arrays.asList(DeviceType.values())
                .contains(DeviceType.BATTERY));
    }
}