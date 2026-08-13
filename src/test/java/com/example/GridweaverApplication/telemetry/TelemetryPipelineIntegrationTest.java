package com.example.GridweaverApplication.telemetry;

import com.example.GridweaverApplication.model.DeviceStatus;
import com.example.GridweaverApplication.model.DeviceType;
import com.example.GridweaverApplication.model.TelemetryPayload;

import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import org.springframework.messaging.converter.JacksonJsonMessageConverter;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;

import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.time.Instant;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
                "gridweaver.iot.simulator.enabled=false"
        }
)
class TelemetryWebSocketIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Test
    void telemetryShouldTravelThroughWebSocketPipeline()
            throws Exception {

        // =========================================================
        // 1. Create WebSocket client
        // =========================================================

        StandardWebSocketClient webSocketClient =
                new StandardWebSocketClient();

        WebSocketStompClient stompClient =
                new WebSocketStompClient(webSocketClient);

        stompClient.setMessageConverter(
                new JacksonJsonMessageConverter()
        );

        // =========================================================
        // 2. Connect to /ws-grid
        // =========================================================

        String websocketUrl =
                "ws://localhost:" + port + "/ws-grid";

        StompSession session =
                stompClient
                        .connectAsync(
                                websocketUrl,
                                new WebSocketHttpHeaders(),
                                new StompSessionHandlerAdapter() {
                                }
                        )
                        .get(10, TimeUnit.SECONDS);

        assertNotNull(session);
        assertTrue(
                session.isConnected(),
                "WebSocket connection failed"
        );

        System.out.println(
                "✅ Connected to WebSocket: " + websocketUrl
        );

        // =========================================================
        // 3. Create queue for received telemetry
        // =========================================================

        BlockingQueue<TelemetryPayload> telemetryQueue =
                new LinkedBlockingQueue<>();

        // =========================================================
        // 4. Subscribe to /topic/telemetry
        // =========================================================

        session.subscribe(
                "/topic/telemetry",
                new StompFrameHandler() {

                    @Override
                    public Type getPayloadType(
                            StompHeaders headers
                    ) {
                        return TelemetryPayload.class;
                    }

                    @Override
                    public void handleFrame(
                            StompHeaders headers,
                            Object payload
                    ) {

                        TelemetryPayload telemetry =
                                (TelemetryPayload) payload;

                        System.out.println(
                                "📡 Received telemetry: "
                                        + telemetry
                        );

                        telemetryQueue.offer(telemetry);
                    }
                }
        );

        // =========================================================
        // 5. Create test telemetry
        // =========================================================

        TelemetryPayload expectedTelemetry =
                new TelemetryPayload(
                        "TEST-SOLAR-001",
                        DeviceType.SOLAR_PANEL,
                        DeviceStatus.GENERATING,
                        150.50,
                        0.0,
                        19.0760,
                        72.8777,
                        Instant.now()
                );

        System.out.println(
                "📤 Sending telemetry: "
                        + expectedTelemetry
        );

        // =========================================================
        // 6. Publish through Spring WebSocket broker
        // =========================================================

        messagingTemplate.convertAndSend(
                "/topic/telemetry",
                expectedTelemetry
        );

        // =========================================================
        // 7. Wait for message
        // =========================================================

        TelemetryPayload receivedTelemetry =
                telemetryQueue.poll(
                        10,
                        TimeUnit.SECONDS
                );

        // =========================================================
        // 8. Verify message arrived
        // =========================================================

        assertNotNull(
                receivedTelemetry,
                "❌ Telemetry was not received"
        );

        System.out.println(
                "📥 Received telemetry: "
                        + receivedTelemetry
        );

        // =========================================================
        // 9. Verify every field
        // =========================================================

        assertEquals(
                expectedTelemetry.deviceId(),
                receivedTelemetry.deviceId()
        );

        assertEquals(
                expectedTelemetry.deviceType(),
                receivedTelemetry.deviceType()
        );

        assertEquals(
                expectedTelemetry.status(),
                receivedTelemetry.status()
        );

        assertEquals(
                expectedTelemetry.outputWatts(),
                receivedTelemetry.outputWatts(),
                0.001
        );

        assertEquals(
                expectedTelemetry.batteryLevelPct(),
                receivedTelemetry.batteryLevelPct(),
                0.001
        );

        assertEquals(
                expectedTelemetry.latitude(),
                receivedTelemetry.latitude(),
                0.000001
        );

        assertEquals(
                expectedTelemetry.longitude(),
                receivedTelemetry.longitude(),
                0.000001
        );

        assertEquals(
                expectedTelemetry.timestamp(),
                receivedTelemetry.timestamp()
        );

        // =========================================================
        // 10. Cleanup
        // =========================================================

        session.disconnect();
        stompClient.stop();

        System.out.println(
                "=============================================="
        );

        System.out.println(
                "✅ TELEMETRY WEBSOCKET INTEGRATION TEST PASSED"
        );

        System.out.println(
                "=============================================="
        );
    }
}