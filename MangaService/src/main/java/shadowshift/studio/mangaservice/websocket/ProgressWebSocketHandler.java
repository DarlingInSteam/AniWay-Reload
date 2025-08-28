package shadowshift.studio.mangaservice.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Component
public class ProgressWebSocketHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(ProgressWebSocketHandler.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Хранение активных WebSocket сессий
    private final CopyOnWriteArraySet<WebSocketSession> sessions = new CopyOnWriteArraySet<>();

    // Хранение сессий по task ID для targeted обновлений
    private final Map<String, CopyOnWriteArraySet<WebSocketSession>> taskSessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        sessions.add(session);
        logger.info("WebSocket connection established: {}", session.getId());

        // Отправляем приветственное сообщение
        sendToSession(session, Map.of(
            "type", "connection",
            "message", "WebSocket connection established",
            "sessionId", session.getId()
        ));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) throws Exception {
        sessions.remove(session);

        // Удаляем сессию из всех task-specific групп
        taskSessions.values().forEach(taskSessionSet -> taskSessionSet.remove(session));

        logger.info("WebSocket connection closed: {} Reason: {} Code: {}", session.getId(), status.getReason(), status.getCode());
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        logger.error("WebSocket transport error on session {}: {}", session.getId(), exception.getMessage(), exception);
        super.handleTransportError(session, exception);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        try {
            Map<String, Object> payload = objectMapper.readValue(message.getPayload(), Map.class);
            String action = (String) payload.get("action");

            if ("subscribe".equals(action)) {
                String taskId = (String) payload.get("taskId");
                if (taskId != null) {
                    subscribeToTask(session, taskId);
                    logger.info("Session {} subscribed to task {}", session.getId(), taskId);
                }
            } else if ("unsubscribe".equals(action)) {
                String taskId = (String) payload.get("taskId");
                if (taskId != null) {
                    unsubscribeFromTask(session, taskId);
                    logger.info("Session {} unsubscribed from task {}", session.getId(), taskId);
                }
            }
        } catch (Exception e) {
            logger.error("Error handling WebSocket message: {}", e.getMessage());
        }
    }

    /**
     * Подписывает сессию на обновления конкретной задачи
     */
    public void subscribeToTask(WebSocketSession session, String taskId) {
        taskSessions.computeIfAbsent(taskId, k -> new CopyOnWriteArraySet<>()).add(session);
    }

    /**
     * Отписывает сессию от обновлений конкретной задачи
     */
    public void unsubscribeFromTask(WebSocketSession session, String taskId) {
        CopyOnWriteArraySet<WebSocketSession> taskSessionSet = taskSessions.get(taskId);
        if (taskSessionSet != null) {
            taskSessionSet.remove(session);
            if (taskSessionSet.isEmpty()) {
                taskSessions.remove(taskId);
            }
        }
    }

    /**
     * Отправляет обновление прогресса всем подписанным на задачу сессиям
     */
    public void sendProgressUpdate(String taskId, Map<String, Object> progressData) {
        CopyOnWriteArraySet<WebSocketSession> taskSessionSet = taskSessions.get(taskId);
        logger.info("sendProgressUpdate: taskId={}, sessions={}", taskId, taskSessionSet != null ? taskSessionSet.size() : 0);
        if (taskSessionSet != null && !taskSessionSet.isEmpty()) {
            Map<String, Object> message = Map.of(
                "type", "progress",
                "taskId", taskId,
                "data", progressData
            );
            logger.info("sendProgressUpdate: message={}", message);
            taskSessionSet.forEach(session -> {
                logger.info("sendProgressUpdate: sending to session {}", session.getId());
                sendToSession(session, message);
            });
        } else {
            logger.warn("sendProgressUpdate: no active sessions for taskId={}", taskId);
        }
    }

    /**
     * Отправляет лог-сообщение всем подписанным на задачу сессиям
     */
    public void sendLogMessage(String taskId, String level, String message) {
        CopyOnWriteArraySet<WebSocketSession> taskSessionSet = taskSessions.get(taskId);
        if (taskSessionSet != null && !taskSessionSet.isEmpty()) {
            Map<String, Object> logMessage = Map.of(
                "type", "log",
                "taskId", taskId,
                "level", level,
                "message", message,
                "timestamp", System.currentTimeMillis()
            );

            taskSessionSet.forEach(session -> sendToSession(session, logMessage));
        }
    }

    /**
     * Отправляет сообщение всем активным сессиям
     */
    public void broadcast(Map<String, Object> message) {
        sessions.forEach(session -> sendToSession(session, message));
    }

    /**
     * Отправляет сообщение конкретной сессии
     */
    private void sendToSession(WebSocketSession session, Map<String, Object> message) {
        if (session.isOpen()) {
            try {
                String jsonMessage = objectMapper.writeValueAsString(message);
                session.sendMessage(new TextMessage(jsonMessage));
            } catch (IOException e) {
                logger.error("Error sending WebSocket message to session {}: {}", session.getId(), e.getMessage());
            }
        }
    }
}
