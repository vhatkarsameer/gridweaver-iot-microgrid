package gridweaver_iot_microgrid.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import gridweaver_iot_microgrid.model.TelemetryPayload;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Service
public class TelemetryTcpServer {
    private static final Logger log = LoggerFactory.getLogger(TelemetryTcpServer.class);
    private final TelemetryKafkaProducer kafkaProducer;
    private final ObjectMapper objectMapper;
    private ServerSocket serverSocket;
    private final ExecutorService virtualThreadExecutor = Executors.newVirtualThreadPerTaskExecutor();
    private volatile boolean running = true;

    public TelemetryTcpServer(TelemetryKafkaProducer kafkaProducer) {
        this.kafkaProducer = kafkaProducer;
        // Jackson mapper to deserialize incoming JSON from sockets
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    @PostConstruct
    public void startServer() {
        virtualThreadExecutor.submit(() -> {
            try {
                serverSocket = new ServerSocket(9090);
                log.info("  [NETWORK LAYER] TCP Ingestion Server listening on port 9090");
                log.info("  [JAVA 21] Ready to map 1 Virtual Thread per inbound socket connection");

                while (running) {
                    // Blocking call, waiting for an IoT device to connect
                    Socket clientSocket = serverSocket.accept();

                    // The core requirement: 1 Virtual Thread per socket
                    Thread.startVirtualThread(() -> handleClientSocket(clientSocket));
                }
            } catch (Exception e) {
                if (running) log.error("TCP Server error: ", e);
            }
        });
    }

    private void handleClientSocket(Socket socket) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream()))) {
            String line;
            // Read telemetry stream from the open socket
            while ((line = reader.readLine()) != null) {
                TelemetryPayload payload = objectMapper.readValue(line, TelemetryPayload.class);

                // Immediately offload to Kafka
                kafkaProducer.publishTelemetry(payload);
            }
        } catch (Exception e) {
            log.debug("Device socket disconnected.");
        } finally {
            try { socket.close(); } catch (Exception ignore) {}
        }
    }

    @PreDestroy
    public void stopServer() {
        running = false;
        try { if (serverSocket != null) serverSocket.close(); } catch (Exception ignore) {}
        virtualThreadExecutor.shutdownNow();
    }
}