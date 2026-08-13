package com.example.GridweaverApplication.telemetry;

import com.example.GridweaverApplication.model.DeviceStatus;
import com.example.GridweaverApplication.model.DeviceType;
import com.example.GridweaverApplication.model.TelemetryPayload;
import com.example.GridweaverApplication.service.IotSimulatorService;

import org.jspecify.annotations.NonNull;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import org.springframework.messaging.converter.JacksonJsonMessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;

import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT
)
class TelemetryPipelineIntegrationTest {

    @LocalServerPort
    private int port;

    @Autowired
    private IotSimulatorService iotSimulatorService;

    private WebSocketStompClient stompClient;

    private StompSession stompSession;

    private final BlockingQueue<TelemetryPayload> receivedTelemetry =
            new LinkedBlockingQueue<>();


    // ============================================================
    // SETUP
    // ============================================================

    @BeforeEach
    void setUp() throws Exception {

        // Create normal WebSocket client
        StandardWebSocketClient webSocketClient =
                new StandardWebSocketClient();

        // Create STOMP client
        stompClient =
                new WebSocketStompClient(webSocketClient);

        // Let Spring/Jackson convert JSON
        // directly into TelemetryPayload
        stompClient.setMessageConverter(
                new JacksonJsonMessageConverter()
        );

        // Actual endpoint from WebSocketConfig
        String websocketUrl =
                "ws://localhost:" + port + "/ws-grid";


        // STOMP connection handler
        StompSessionHandlerAdapter sessionHandler =
                new StompSessionHandlerAdapter() {

                    @Override
                    public void afterConnected(
                            @NonNull StompSession session,
                            @NonNull StompHeaders connectedHeaders) {

                        System.out.println(
                                "WebSocket connected successfully!"
                        );
                    }

                    @Override
                    public void handleTransportError(
                            @NonNull StompSession session,
                            Throwable exception) {

                        System.err.println(
                                "WebSocket transport error:"
                        );

                        exception.printStackTrace();
                    }
                };


        // Connect to WebSocket
        stompSession =
                stompClient
                        .connectAsync(
                                websocketUrl,
                                sessionHandler
                        )
                        .get(
                                5,
                                TimeUnit.SECONDS
                        );


        // Verify connection
        assertNotNull(stompSession);

        assertTrue(
                stompSession.isConnected(),
                "STOMP session should be connected"
        );


        System.out.println(
                "Connected to: " + websocketUrl
        );


        // ========================================================
        // SUBSCRIBE TO TELEMETRY TOPIC
        // ========================================================

        stompSession.subscribe(
                "/topic/telemetry",

                new StompFrameHandler() {

                    @Override
                    public Type getPayloadType(
                            @NonNull StompHeaders headers) {

                        // IMPORTANT:
                        // Tell Spring that incoming JSON
                        // should become TelemetryPayload.

                        return TelemetryPayload.class;
                    }


                    @Override
                    public void handleFrame(
                            @NonNull StompHeaders headers,
                            Object payload) {

                        System.out.println(
                                "Received telemetry:"
                        );

                        System.out.println(payload);


                        // Spring already converted JSON
                        // into TelemetryPayload.

                        TelemetryPayload telemetry =
                                (TelemetryPayload) payload;


                        // Put received telemetry into queue
                        receivedTelemetry.add(
                                telemetry
                        );
                    }
                }
        );


        // Give subscription a little time
        Thread.sleep(200);
    }


    // ============================================================
    // TELEMETRY PIPELINE INTEGRATION TEST
    // ============================================================

    @Test
    void shouldGenerateAndBroadcastSolarAndBatteryTelemetry()
            throws Exception {

        System.out.println(
                "\n========== START TELEMETRY TEST ==========\n"
        );


        // ========================================================
        // CALL REAL IOT SIMULATOR SERVICE
        // ========================================================

        iotSimulatorService.generateAndBroadcastTelemetry();


        // ========================================================
        // RECEIVE FIRST TELEMETRY
        // ========================================================

        TelemetryPayload firstPayload =
                receivedTelemetry.poll(
                        5,
                        TimeUnit.SECONDS
                );


        // ========================================================
        // RECEIVE SECOND TELEMETRY
        // ========================================================

        TelemetryPayload secondPayload =
                receivedTelemetry.poll(
                        5,
                        TimeUnit.SECONDS
                );


        // ========================================================
        // VERIFY MESSAGES WERE RECEIVED
        // ========================================================

        assertNotNull(
                firstPayload,
                "First telemetry message was not received"
        );

        assertNotNull(
                secondPayload,
                "Second telemetry message was not received"
        );


        // ========================================================
        // IDENTIFY SOLAR AND BATTERY PAYLOADS
        // ========================================================

        TelemetryPayload solarPayload;

        TelemetryPayload batteryPayload;


        if (firstPayload.deviceType()
                == DeviceType.SOLAR_PANEL
                &&
                secondPayload.deviceType()
                        == DeviceType.BATTERY) {

            solarPayload = firstPayload;
            batteryPayload = secondPayload;

        } else if (
                firstPayload.deviceType()
                        == DeviceType.BATTERY
                        &&
                        secondPayload.deviceType()
                                == DeviceType.SOLAR_PANEL) {

            solarPayload = secondPayload;
            batteryPayload = firstPayload;

        } else {

            fail(
                    "Expected one SOLAR_PANEL and one BATTERY payload"
            );

            return;
        }


        // ========================================================
        // VERIFY SOLAR PAYLOAD
        // ========================================================

        assertNotNull(
                solarPayload.deviceId()
        );

        assertTrue(
                solarPayload.deviceId()
                        .startsWith("SOLAR-MUM-")
        );

        assertEquals(
                DeviceType.SOLAR_PANEL,
                solarPayload.deviceType()
        );

        assertEquals(
                DeviceStatus.GENERATING,
                solarPayload.status()
        );


        // Solar output:
        // 80 <= outputWatts < 200

        assertTrue(
                solarPayload.outputWatts() >= 80.0
                        &&
                        solarPayload.outputWatts() <= 200.0,
                "Solar output should be between 80W and 200W"
        );


        // Solar battery level must be 0

        assertEquals(
                0.0,
                solarPayload.batteryLevelPct()
        );


        // Mumbai latitude

        assertTrue(
                solarPayload.latitude() >= 19.0260
                        &&
                        solarPayload.latitude() <= 19.1260,
                "Solar latitude is outside expected range"
        );


        // Mumbai longitude

        assertTrue(
                solarPayload.longitude() >= 72.8277
                        &&
                        solarPayload.longitude() <= 72.9277,
                "Solar longitude is outside expected range"
        );


        assertNotNull(
                solarPayload.timestamp()
        );


        // ========================================================
        // VERIFY BATTERY PAYLOAD
        // ========================================================

        assertNotNull(
                batteryPayload.deviceId()
        );

        assertTrue(
                batteryPayload.deviceId()
                        .startsWith("BATT-MUM-")
        );

        assertEquals(
                DeviceType.BATTERY,
                batteryPayload.deviceType()
        );


        // Battery status:
        // CHARGING OR DISCHARGING

        assertTrue(
                batteryPayload.status()
                        == DeviceStatus.CHARGING
                        ||
                        batteryPayload.status()
                                == DeviceStatus.DISCHARGING,
                "Battery status should be CHARGING or DISCHARGING"
        );


        // Battery output:
        // 1500 <= outputWatts < 2500

        assertTrue(
                batteryPayload.outputWatts() >= 1500.0
                        &&
                        batteryPayload.outputWatts() <= 2500.0,
                "Battery output should be between 1500W and 2500W"
        );


        // Battery level:
        // 40 <= batteryLevelPct < 90

        assertTrue(
                batteryPayload.batteryLevelPct() >= 40.0
                        &&
                        batteryPayload.batteryLevelPct() <= 90.0,
                "Battery level should be between 40% and 90%"
        );


        // Mumbai latitude

        assertTrue(
                batteryPayload.latitude() >= 19.0260
                        &&
                        batteryPayload.latitude() <= 19.1260,
                "Battery latitude is outside expected range"
        );


        // Mumbai longitude

        assertTrue(
                batteryPayload.longitude() >= 72.8277
                        &&
                        batteryPayload.longitude() <= 72.9277,
                "Battery longitude is outside expected range"
        );


        assertNotNull(
                batteryPayload.timestamp()
        );


        // ========================================================
        // SUCCESS
        // ========================================================

        System.out.println(
                "\n========== TELEMETRY TEST PASSED ==========\n"
        );
    }


    // ============================================================
    // CLEANUP
    // ============================================================

    @AfterEach
    void tearDown() {

        if (stompSession != null &&
                stompSession.isConnected()) {

            stompSession.disconnect();
        }

        if (stompClient != null) {

            stompClient.stop();
        }

        receivedTelemetry.clear();
    }
}