package gridweaver_iot_microgrid.config;


import gridweaver_iot_microgrid.model.DeviceEvent;
import gridweaver_iot_microgrid.model.DeviceStatus;
import org.springframework.context.annotation.Configuration;
import org.springframework.statemachine.config.EnableStateMachineFactory;
import org.springframework.statemachine.config.EnumStateMachineConfigurerAdapter;
import org.springframework.statemachine.config.builders.StateMachineStateConfigurer;
import org.springframework.statemachine.config.builders.StateMachineTransitionConfigurer;

import java.util.EnumSet;

@Configuration
@EnableStateMachineFactory
public class StateMachineConfig extends EnumStateMachineConfigurerAdapter<DeviceStatus, DeviceEvent> {

    @Override
    public void configure(StateMachineStateConfigurer<DeviceStatus, DeviceEvent> states) throws Exception {
        states
                .withStates()
                .initial(DeviceStatus.IDLE)
                .states(EnumSet.allOf(DeviceStatus.class));
    }

    @Override
    public void configure(StateMachineTransitionConfigurer<DeviceStatus, DeviceEvent> transitions) throws Exception {
        transitions
                // Solar transitions
                .withExternal().source(DeviceStatus.IDLE).target(DeviceStatus.GENERATING).event(DeviceEvent.SUN_RISES)
                .and()
                .withExternal().source(DeviceStatus.GENERATING).target(DeviceStatus.IDLE).event(DeviceEvent.SUN_SETS)
                .and()

                // Battery transitions
                .withExternal().source(DeviceStatus.IDLE).target(DeviceStatus.CHARGING).event(DeviceEvent.GRID_SURPLUS)
                .and()
                .withExternal().source(DeviceStatus.CHARGING).target(DeviceStatus.IDLE).event(DeviceEvent.BATTERY_FULL)
                .and()
                .withExternal().source(DeviceStatus.IDLE).target(DeviceStatus.DISCHARGING).event(DeviceEvent.GRID_DEFICIT)
                .and()
                .withExternal().source(DeviceStatus.DISCHARGING).target(DeviceStatus.IDLE).event(DeviceEvent.BATTERY_EMPTY)
                .and()
                .withExternal().source(DeviceStatus.CHARGING).target(DeviceStatus.DISCHARGING).event(DeviceEvent.GRID_DEFICIT)
                .and()
                .withExternal().source(DeviceStatus.DISCHARGING).target(DeviceStatus.CHARGING).event(DeviceEvent.GRID_SURPLUS)
                .and()


                // Fault handling (Can happen from any active state)
                .withExternal().source(DeviceStatus.IDLE).target(DeviceStatus.FAULT).event(DeviceEvent.SYSTEM_ERROR)
                .and()
                .withExternal().source(DeviceStatus.GENERATING).target(DeviceStatus.FAULT).event(DeviceEvent.SYSTEM_ERROR)
                .and()
                .withExternal().source(DeviceStatus.CHARGING).target(DeviceStatus.FAULT).event(DeviceEvent.SYSTEM_ERROR)
                .and()
                .withExternal().source(DeviceStatus.DISCHARGING).target(DeviceStatus.FAULT).event(DeviceEvent.SYSTEM_ERROR)
                .and()

                // Manual reset clears the fault
                .withExternal().source(DeviceStatus.FAULT).target(DeviceStatus.IDLE).event(DeviceEvent.MANUAL_RESET);
    }
}
