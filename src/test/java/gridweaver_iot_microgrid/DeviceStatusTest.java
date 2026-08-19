package gridweaver_iot_microgrid;

import gridweaver_iot_microgrid.model.DeviceStatus;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class DeviceStatusTest {

    @Test
    void shouldContainExpectedDeviceStatuses() {
        assertEquals(5, DeviceStatus.values().length);

        assertTrue(java.util.Arrays.asList(DeviceStatus.values())
                .contains(DeviceStatus.IDLE));

        assertTrue(java.util.Arrays.asList(DeviceStatus.values())
                .contains(DeviceStatus.GENERATING));

        assertTrue(java.util.Arrays.asList(DeviceStatus.values())
                .contains(DeviceStatus.CHARGING));

        assertTrue(java.util.Arrays.asList(DeviceStatus.values())
                .contains(DeviceStatus.FAULT));

        assertTrue(java.util.Arrays.asList(DeviceStatus.values())
                .contains(DeviceStatus.DISCHARGING));
    }
}