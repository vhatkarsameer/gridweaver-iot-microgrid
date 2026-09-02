package gridweaver_iot_microgrid.service;

import gridweaver_iot_microgrid.model.DeviceEvent;
import gridweaver_iot_microgrid.model.DeviceStatus;
import gridweaver_iot_microgrid.model.DeviceType;
import gridweaver_iot_microgrid.model.TelemetryPayload;
import org.springframework.statemachine.StateMachine;
import org.springframework.statemachine.config.StateMachineFactory;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

@Service
public class DeviceStateProcessor {

    private final StateMachineFactory<DeviceStatus, DeviceEvent> stateMachineFactory;

    // In-memory cache to hold a unique state machine for every single device
    private final ConcurrentHashMap<String, StateMachine<DeviceStatus, DeviceEvent>> machineCache = new ConcurrentHashMap<>();

    public DeviceStateProcessor(StateMachineFactory<DeviceStatus, DeviceEvent> stateMachineFactory) {
        this.stateMachineFactory = stateMachineFactory;
    }

    public DeviceStatus processAndGetState(TelemetryPayload payload) {
        // 1. Fetch or create the state machine for this specific device
        StateMachine<DeviceStatus, DeviceEvent> sm = machineCache.computeIfAbsent(payload.deviceId(), id -> {
            StateMachine<DeviceStatus, DeviceEvent> newMachine = stateMachineFactory.getStateMachine(id);
            newMachine.start();
            return newMachine;
        });

        // 2. Evaluate the live telemetry to determine the trigger event
        DeviceEvent eventToFire = null;

        if (payload.deviceType() == DeviceType.SOLAR_PANEL) {
            if (payload.outputWatts() > 0) {
                eventToFire = DeviceEvent.SUN_RISES;
            } else {
                eventToFire = DeviceEvent.SUN_SETS;
            }
        } else if (payload.deviceType() == DeviceType.BATTERY) {
            if (payload.batteryLevelPct() >= 100) {
                eventToFire = DeviceEvent.BATTERY_FULL;
            } else if (payload.batteryLevelPct() <= 0) {
                eventToFire = DeviceEvent.BATTERY_EMPTY;
            } else if (payload.outputWatts() > 0) {
                eventToFire = DeviceEvent.GRID_DEFICIT; // Outputting power = Discharging
            } else if (payload.outputWatts() < 0) {
                eventToFire = DeviceEvent.GRID_SURPLUS; // Consuming power = Charging
            }
        }

        // 3. Trigger the state transition rule in the machine
        if (eventToFire != null) {
            sm.sendEvent(eventToFire);
        }

        // 4. Return the official state
        return sm.getState().getId();
    }
}