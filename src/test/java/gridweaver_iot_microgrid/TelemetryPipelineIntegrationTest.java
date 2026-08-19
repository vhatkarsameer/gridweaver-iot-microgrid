package gridweaver_iot_microgrid;

import gridweaver_iot_microgrid.model.DeviceStatus;
import gridweaver_iot_microgrid.model.DeviceType;
import gridweaver_iot_microgrid.model.TelemetryPayload;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.converter.StringMessageConverter;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.time.Instant;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "iot.simulator.enabled=false"
)
class TelemetryPipelineIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Test
    void telemetryShouldTravelThroughWebSocketPipeline()
            throws Exception {

        System.out.println(
                "\n=============================================="
        );

        System.out.println(
                "🚀 STARTING TELEMETRY WEBSOCKET INTEGRATION TEST"
        );

        System.out.println(
                "==============================================\n"
        );

        // =========================================================
        // 1. Create WebSocket STOMP client
        // =========================================================

        StandardWebSocketClient webSocketClient =
                new StandardWebSocketClient();

        WebSocketStompClient stompClient =
                new WebSocketStompClient(webSocketClient);

        /*
         * The server publishes telemetry as JSON text.
         * Therefore the test receives it as String.
         */
        stompClient.setMessageConverter(
                new StringMessageConverter()
        );

        // =========================================================
        // 2. Build WebSocket URL
        // =========================================================

        String websocketUrl =
                "ws://localhost:" + port + "/ws-grid";

        System.out.println(
                "🔌 Connecting to WebSocket:"
        );

        System.out.println(
                websocketUrl
        );

        // =========================================================
        // 3. Connect to STOMP WebSocket endpoint
        // =========================================================

        StompSession session =
                stompClient
                        .connectAsync(
                                websocketUrl,
                                new StompSessionHandlerAdapter() {

                                    @Override
                                    public void handleTransportError(
                                            StompSession session,
                                            Throwable exception
                                    ) {

                                        System.err.println(
                                                "❌ WebSocket transport error:"
                                        );

                                        exception.printStackTrace();
                                    }
                                }
                        )
                        .get(
                                10,
                                TimeUnit.SECONDS
                        );

        // =========================================================
        // 4. Verify STOMP connection
        // =========================================================

        assertNotNull(
                session,
                "❌ STOMP session is null"
        );

        assertTrue(
                session.isConnected(),
                "❌ STOMP session is not connected"
        );

        System.out.println(
                "✅ STOMP WebSocket connection established"
        );

        // =========================================================
        // 5. Create queue for received messages
        // =========================================================

        BlockingQueue<String> receivedMessages =
                new LinkedBlockingQueue<>();

        CountDownLatch messageReceived =
                new CountDownLatch(1);

        // =========================================================
        // 6. Subscribe to telemetry topic
        // =========================================================

        StompHeaders subscribeHeaders =
                new StompHeaders();

        subscribeHeaders.setDestination(
                "/topic/telemetry"
        );

        System.out.println(
                "📡 Subscribing to /topic/telemetry..."
        );

        StompSession.Subscription subscription =
                session.subscribe(
                        subscribeHeaders,
                        new StompFrameHandler() {

                            @Override
                            public Type getPayloadType(
                                    StompHeaders headers
                            ) {

                                return String.class;
                            }

                            @Override
                            public void handleFrame(
                                    StompHeaders headers,
                                    Object payload
                            ) {

                                String message =
                                        String.valueOf(payload);

                                System.out.println(
                                        "\n📥 RECEIVED WEBSOCKET TELEMETRY:"
                                );

                                System.out.println(
                                        message
                                );

                                /*
                                 * Store received message.
                                 */
                                receivedMessages.offer(
                                        message
                                );

                                /*
                                 * Tell the test that a message
                                 * has arrived.
                                 */
                                messageReceived.countDown();
                            }
                        }
                );

        assertNotNull(
                subscription,
                "❌ Subscription was not created"
        );

        System.out.println(
                "✅ Subscribed to /topic/telemetry"
        );

        // =========================================================
        // 7. Create test telemetry
        // =========================================================

        Instant timestamp =
                Instant.now();

        TelemetryPayload telemetry =
                new TelemetryPayload(
                        "TEST-SOLAR-001",
                        DeviceType.SOLAR_PANEL,
                        DeviceStatus.GENERATING,
                        150.5,
                        0.0,
                        19.0760,
                        72.8777,
                        timestamp
                );

        System.out.println(
                "\n📤 TEST TELEMETRY:"
        );

        System.out.println(
                telemetry
        );

        // =========================================================
        // 8. Convert telemetry to JSON
        // =========================================================

        String telemetryJson =
                """
                {
                  "deviceId": "%s",
                  "deviceType": "%s",
                  "status": "%s",
                  "outputWatts": %s,
                  "batteryLevelPct": %s,
                  "latitude": %s,
                  "longitude": %s,
                  "timestamp": "%s"
                }
                """.formatted(
                        telemetry.deviceId(),
                        telemetry.deviceType(),
                        telemetry.status(),
                        telemetry.outputWatts(),
                        telemetry.batteryLevelPct(),
                        telemetry.latitude(),
                        telemetry.longitude(),
                        telemetry.timestamp()
                );

        System.out.println(
                "\n📦 TEST TELEMETRY JSON:"
        );

        System.out.println(
                telemetryJson
        );

        // =========================================================
        // 9. Publish through Spring STOMP broker
        // =========================================================

        System.out.println(
                "\n📤 Publishing telemetry to:"
        );

        System.out.println(
                "/topic/telemetry"
        );

        messagingTemplate.convertAndSend(
                "/topic/telemetry",
                telemetryJson
        );

        System.out.println(
                "✅ Telemetry published"
        );

        // =========================================================
        // 10. Wait for WebSocket client to receive it
        // =========================================================

        System.out.println(
                "\n⏳ Waiting for WebSocket telemetry..."
        );

        boolean received =
                messageReceived.await(
                        10,
                        TimeUnit.SECONDS
                );

        // =========================================================
        // 11. Verify message was received
        // =========================================================

        assertTrue(
                received,
                """
                ❌ Telemetry was not received through WebSocket.

                Expected:
                /topic/telemetry

                Check:
                - STOMP connection
                - subscription
                - broker
                - messagingTemplate.convertAndSend()
                """
        );

        // =========================================================
        // 12. Get received telemetry
        // =========================================================

        String receivedTelemetry =
                receivedMessages.poll(
                        2,
                        TimeUnit.SECONDS
                );

        assertNotNull(
                receivedTelemetry,
                "❌ Received telemetry message is null"
        );

        System.out.println(
                "\n✅ TELEMETRY RECEIVED SUCCESSFULLY"
        );

        // =========================================================
        // 13. Validate telemetry fields
        // =========================================================

        assertTrue(
                receivedTelemetry.contains(
                        "TEST-SOLAR-001"
                ),
                "❌ Device ID was not found"
        );

        assertTrue(
                receivedTelemetry.contains(
                        "SOLAR_PANEL"
                ),
                "❌ Device type was not found"
        );

        assertTrue(
                receivedTelemetry.contains(
                        "GENERATING"
                ),
                "❌ Device status was not found"
        );

        assertTrue(
                receivedTelemetry.contains(
                        "150.5"
                ),
                "❌ Output watts was not found"
        );

        assertTrue(
                receivedTelemetry.contains(
                        "19.076"
                ),
                "❌ Latitude was not found"
        );

        assertTrue(
                receivedTelemetry.contains(
                        "72.8777"
                ),
                "❌ Longitude was not found"
        );

        // =========================================================
        // 14. Test passed
        // =========================================================

        System.out.println(
                "\n=============================================="
        );

        System.out.println(
                "✅ TELEMETRY WEBSOCKET INTEGRATION TEST PASSED"
        );

        System.out.println(
                "==============================================\n"
        );

        // =========================================================
        // 15. Cleanup
        // =========================================================

        if (subscription != null) {
            subscription.unsubscribe();
        }

        if (session.isConnected()) {
            session.disconnect();
        }

        stompClient.stop();

        System.out.println(
                "🧹 WebSocket test resources cleaned up"
        );
    }
}