package gridweaver_iot_microgrid.service;

import gridweaver_iot_microgrid.DTO.GridStateSummary;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class GridStateBroadcastService {

    private final GridStateEngine gridStateEngine;
    private final SimpMessagingTemplate messagingTemplate;

    public GridStateBroadcastService(GridStateEngine gridStateEngine, SimpMessagingTemplate messagingTemplate) {
        this.gridStateEngine = gridStateEngine;
        this.messagingTemplate = messagingTemplate;
    }

    @Scheduled(fixedRate = 1000)
    public void broadcastGridState() {
        GridStateSummary summary = gridStateEngine.calculateGridSummary();

        messagingTemplate.convertAndSend("/topic/grid-state", summary);
    }
}
