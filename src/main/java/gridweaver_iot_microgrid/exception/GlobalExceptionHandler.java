package gridweaver_iot_microgrid.exception;

import gridweaver_iot_microgrid.service.AuditLogService;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    private final AuditLogService auditLogService;

    public GlobalExceptionHandler(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @ExceptionHandler(Exception.class)
    public void handleGeneralException(Exception ex) {
        auditLogService.logHardwareFault("SYSTEM_CORE", "Unhandled Backend Exception: " + ex.getMessage());
    }

    @MessageExceptionHandler(RuntimeException.class)
    public void handleWebSocketException(RuntimeException ex) {
        auditLogService.logHardwareFault("WEBSOCKET_PIPELINE", "Malformed Telemetry Dropped: " + ex.getMessage());
    }
}
