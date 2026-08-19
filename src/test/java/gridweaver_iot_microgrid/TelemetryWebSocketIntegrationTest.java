package gridweaver_iot_microgrid;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import gridweaver_iot_microgrid.model.DeviceStatus;
import gridweaver_iot_microgrid.model.DeviceType;
import gridweaver_iot_microgrid.model.TelemetryPayload;
import gridweaver_iot_microgrid.service.TelemetryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.time.Instant;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT
)
@TestPropertySource(properties = {
        "iot.simulator.enabled=false",
        "logging.level.org.springframework.web.socket=DEBUG",
        "logging.level.org.springframework.messaging=DEBUG",
        "logging.level.org.springframework.web.socket.messaging=DEBUG"
})
class TelemetryWebSocketIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TelemetryService telemetryService;

    private WebSocketStompClient stompClient;

    private BlockingQueue<TelemetryPayload> receivedMessages;

    @BeforeEach
    void setUp() {

        StandardWebSocketClient webSocketClient =
                new StandardWebSocketClient();

        stompClient =
                new WebSocketStompClient(webSocketClient);

        // Configure Jackson for Java time types such as Instant.
        ObjectMapper objectMapper = new ObjectMapper();

        objectMapper.registerModule(
                new JavaTimeModule()
        );

        objectMapper.disable(
                SerializationFeature.WRITE_DATES_AS_TIMESTAMPS
        );

        MappingJackson2MessageConverter messageConverter =
                new MappingJackson2MessageConverter();

        messageConverter.setObjectMapper(
                objectMapper
        );

        stompClient.setMessageConverter(
                messageConverter
        );

        receivedMessages =
                new LinkedBlockingQueue<>();
    }

    @Test
    void shouldReceiveTelemetryThroughWebSocket()
            throws Exception {

        // ==================================================
        // 1. Connect to WebSocket endpoint
        // ==================================================

        String url =
                "ws://localhost:" + port + "/ws-grid";

        System.out.println(
                "Connecting to WebSocket: " + url
        );

        StompSession session =
                stompClient
                        .connectAsync(
                                url,
                                new StompSessionHandlerAdapter() {

                                    @Override
                                    public void afterConnected(
                                            StompSession session,
                                            StompHeaders connectedHeaders) {

                                        System.out.println(
                                                "STOMP CONNECTED. Session ID: "
                                                        + session.getSessionId()
                                        );

                                        System.out.println(
                                                "Connected headers: "
                                                        + connectedHeaders
                                        );
                                    }

                                    @Override
                                    public void handleException(
                                            StompSession session,
                                            StompCommand command,
                                            StompHeaders headers,
                                            byte[] payload,
                                            Throwable exception) {

                                        System.out.println(
                                                "STOMP EXCEPTION"
                                        );

                                        System.out.println(
                                                "Command: " + command
                                        );

                                        System.out.println(
                                                "Headers: " + headers
                                        );

                                        exception.printStackTrace();
                                    }

                                    @Override
                                    public void handleTransportError(
                                            StompSession session,
                                            Throwable exception) {

                                        System.out.println(
                                                "STOMP TRANSPORT ERROR"
                                        );

                                        exception.printStackTrace();
                                    }

                                    @Override
                                    public void handleFrame(
                                            StompHeaders headers,
                                            Object payload) {

                                        System.out.println(
                                                "STOMP ERROR FRAME"
                                        );

                                        System.out.println(
                                                "Headers: " + headers
                                        );

                                        System.out.println(
                                                "Payload: " + payload
                                        );
                                    }
                                }
                        )
                        .get(
                                5,
                                TimeUnit.SECONDS
                        );

        assertNotNull(session);

        assertTrue(
                session.isConnected(),
                "WebSocket session should be connected"
        );

        System.out.println(
                "WebSocket session connected: "
                        + session.isConnected()
        );

        // ==================================================
        // 2. Subscribe to telemetry topic
        // ==================================================

        System.out.println(
                "Subscribing to /topic/telemetry"
        );

        session.subscribe(
                "/topic/telemetry",
                new StompFrameHandler() {

                    @Override
                    public Type getPayloadType(
                            StompHeaders headers) {

                        return TelemetryPayload.class;
                    }

                    @Override
                    public void handleFrame(
                            StompHeaders headers,
                            Object payload) {

                        System.out.println(
                                "========== WEBSOCKET FRAME RECEIVED =========="
                        );

                        System.out.println(
                                "Headers: " + headers
                        );

                        System.out.println(
                                "Payload class: "
                                        + payload.getClass().getName()
                        );

                        System.out.println(
                                "Payload: " + payload
                        );

                        System.out.println(
                                "=============================================="
                        );

                        TelemetryPayload telemetry =
                                (TelemetryPayload) payload;

                        if (!receivedMessages.offer(telemetry)) {

                            throw new IllegalStateException(
                                    "Could not add telemetry to queue"
                            );
                        }
                    }
                }
        );

        System.out.println(
                "Subscription request sent."
        );

        System.out.println(
                "Session connected after subscribe: "
                        + session.isConnected()
        );

        // ==================================================
        // 3. Give the STOMP subscription time to reach server
        // ==================================================

        Thread.sleep(1000);

        // ==================================================
        // 4. Create test telemetry
        // ==================================================

        Instant timestamp = Instant.now();

        TelemetryPayload testTelemetry =
                new TelemetryPayload(
                        "TEST-SOLAR-001",
                        DeviceType.SOLAR_PANEL,
                        DeviceStatus.GENERATING,
                        150.0,
                        0.0,
                        19.0760,
                        72.8777,
                        timestamp
                );

        System.out.println(
                "Sending telemetry through TelemetryService:"
        );

        System.out.println(
                testTelemetry
        );

        // ==================================================
        // 5. Send telemetry through backend service
        // ==================================================

        telemetryService.processTelemetry(
                testTelemetry
        );

        // ==================================================
        // 6. Wait for WebSocket message
        // ==================================================

        System.out.println(
                "Waiting for WebSocket telemetry..."
        );

        TelemetryPayload receivedTelemetry =
                receivedMessages.poll(
                        5,
                        TimeUnit.SECONDS
                );

        // ==================================================
        // 7. Verify message was received
        // ==================================================

        assertNotNull(
                receivedTelemetry,
                "Telemetry was not received through WebSocket"
        );

        // ==================================================
        // 8. Verify all TelemetryPayload fields
        // ==================================================

        assertEquals(
                testTelemetry.deviceId(),
                receivedTelemetry.deviceId()
        );

        assertEquals(
                testTelemetry.deviceType(),
                receivedTelemetry.deviceType()
        );

        assertEquals(
                testTelemetry.status(),
                receivedTelemetry.status()
        );

        assertEquals(
                testTelemetry.outputWatts(),
                receivedTelemetry.outputWatts()
        );

        assertEquals(
                testTelemetry.batteryLevelPct(),
                receivedTelemetry.batteryLevelPct()
        );

        assertEquals(
                testTelemetry.latitude(),
                receivedTelemetry.latitude()
        );

        assertEquals(
                testTelemetry.longitude(),
                receivedTelemetry.longitude()
        );

        assertEquals(
                testTelemetry.timestamp(),
                receivedTelemetry.timestamp()
        );

        System.out.println(
                "Telemetry WebSocket integration test passed."
        );

        // ==================================================
        // 9. Disconnect
        // ==================================================

        session.disconnect();

        System.out.println(
                "WebSocket session disconnected."
        );
    }
}