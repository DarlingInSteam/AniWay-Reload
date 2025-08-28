package shadowshift.studio.mangaservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import shadowshift.studio.mangaservice.websocket.ProgressWebSocketHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketConfig.class);

    @Bean
    public ProgressWebSocketHandler progressWebSocketHandler() {
        logger.info("Creating ProgressWebSocketHandler bean");
        return new ProgressWebSocketHandler();
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        logger.info("Registering WebSocket handlers for /ws/progress");
        registry.addHandler(progressWebSocketHandler(), "/ws/progress")
                .setAllowedOrigins("*"); // В продакшене следует указать конкретные домены
        logger.info("WebSocket handler registered successfully");
    }
}
