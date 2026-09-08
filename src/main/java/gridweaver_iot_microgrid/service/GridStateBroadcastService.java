package gridweaver_iot_microgrid.service;

import gridweaver_iot_microgrid.DTO.GridStateSummary;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class GridStateBroadcastService {

    private final GridStateEngine gridStateEngine;
    private final SimpMessagingTemplate messagingTemplate;
    private final RegionalBalanceService regionalBalanceService;

    public GridStateBroadcastService(GridStateEngine gridStateEngine, SimpMessagingTemplate messagingTemplate, RegionalBalanceService regionalBalanceService) {
        this.gridStateEngine = gridStateEngine;
        this.messagingTemplate = messagingTemplate;
        this.regionalBalanceService = regionalBalanceService;
    }

    @Scheduled(fixedRate = 1000)
    public void broadcastGridState() {
        GridStateSummary summary = gridStateEngine.calculateGridSummary();

        // Fetch live grouped Map/Reduce telemetry
        Map<String, Double> realRegionalNetPower = gridStateEngine.getRegionalNetPowerMap();

        // Execute distributed routing logic based on actual data
        regionalBalanceService.balanceGrid(realRegionalNetPower);

        messagingTemplate.convertAndSend("/topic/grid-state", summary);
    }
}
