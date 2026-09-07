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

    // Update the method signature and battery logic:
    public DeviceStatus processAndGetState(TelemetryPayload payload, double currentGridLoadPct) {
        StateMachine<DeviceStatus, DeviceEvent> sm = machineCache.computeIfAbsent(payload.deviceId(), id -> {
            StateMachine<DeviceStatus, DeviceEvent> newMachine = stateMachineFactory.getStateMachine(id);
            newMachine.start();
            return newMachine;
        });

        DeviceEvent eventToFire = null;
        if (payload.deviceType() == DeviceType.SOLAR_PANEL) {
            eventToFire = payload.outputWatts() > 0 ? DeviceEvent.SUN_RISES : DeviceEvent.SUN_SETS;
        } else if (payload.deviceType() == DeviceType.BATTERY) {
            if(currentGridLoadPct > 80.0)
                eventToFire = payload.batteryLevelPct() > 0 ? DeviceEvent.GRID_DEFICIT : DeviceEvent.BATTERY_EMPTY;
            else
                eventToFire = payload.batteryLevelPct() < 100 ? DeviceEvent.GRID_SURPLUS : DeviceEvent.BATTERY_FULL;
        }

        if (eventToFire != null) sm.sendEvent(eventToFire);
        return sm.getState().getId();
    }
}