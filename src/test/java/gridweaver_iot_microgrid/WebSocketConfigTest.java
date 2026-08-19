package gridweaver_iot_microgrid;

import gridweaver_iot_microgrid.config.WebSocketConfig;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class WebSocketConfigTest {

    @Autowired
    private WebSocketMessageBrokerConfigurer webSocketConfig;

    @Test
    void shouldLoadWebSocketConfiguration() {
        assertNotNull(webSocketConfig);
        assertInstanceOf(WebSocketConfig.class, webSocketConfig);
    }

    @Test
    void shouldBeWebSocketMessageBrokerConfigurer() {
        WebSocketConfig config = new WebSocketConfig();

        assertInstanceOf(WebSocketMessageBrokerConfigurer.class, config);
    }
}