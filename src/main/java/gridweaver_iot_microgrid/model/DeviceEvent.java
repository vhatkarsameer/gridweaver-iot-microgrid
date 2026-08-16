package gridweaver_iot_microgrid.model;

public enum DeviceEvent {
    SUN_RISES,          //Triggers GENERATING for solar
    SUN_SETS,           //Triggers IDLE for solar
    GRID_SURPLUS,       //Triggers CHARGING for batteries
    GRID_DEFICIT,       //Triggers DISCHARGING for batteries
    BATTERY_FULL,       //Triggers IDLE for batteries
    BATTERY_EMPTY,      //Triggers IDLE for batteries
    SYSTEM_ERROR,       //Triggers FAULT
    MANUAL_RESET        //Clear FAULT to IDLE
}
