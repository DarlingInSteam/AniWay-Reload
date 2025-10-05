package shadowshift.studio.notificationservice.messaging;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import shadowshift.studio.notificationservice.domain.NotificationType;
import shadowshift.studio.notificationservice.service.NotificationServiceFacade;

import java.util.LinkedHashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class FriendNotificationListener {

    private final NotificationServiceFacade notificationServiceFacade;
    private final ObjectMapper objectMapper;

    @RabbitListener(queues = "${notifications.friend.queue:notifications.friend.events}")
    public void onFriendEvent(FriendNotificationEvent event) {
        if (event == null) {
            log.warn("Получено пустое событие дружбы");
            return;
        }
        if (event.getTargetUserId() == null) {
            log.warn("Событие дружбы без targetUserId: {}", event);
            return;
        }
        try {
            if (event.getType() == null) {
                log.warn("Событие дружбы без типа: {}", event);
                return;
            }
            switch (event.getType()) {
                case REQUEST_RECEIVED -> handleRequestReceived(event);
                case REQUEST_ACCEPTED -> handleRequestAccepted(event);
                default -> log.warn("Неизвестный тип события дружбы: {}", event.getType());
            }
        } catch (Exception e) {
            log.error("Ошибка обработки события дружбы {}: {}", event.getType(), e.getMessage(), e);
        }
    }

    private void handleRequestReceived(FriendNotificationEvent event) throws JsonProcessingException {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestId", event.getRequestId());
        payload.put("requesterId", event.getRequesterId());
        payload.put("message", event.getMessage());
        payload.put("occurredAt", event.getOccurredAt());
        String payloadJson = objectMapper.writeValueAsString(payload);
        String dedupeKey = event.getRequestId() != null
                ? "friend_request_received:" + event.getTargetUserId() + ':' + event.getRequestId()
                : null;
        notificationServiceFacade.createBasic(
                event.getTargetUserId(),
                NotificationType.FRIEND_REQUEST_RECEIVED,
                payloadJson,
                dedupeKey
        );
    }

    private void handleRequestAccepted(FriendNotificationEvent event) throws JsonProcessingException {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("requestId", event.getRequestId());
        payload.put("accepterId", event.getAccepterId());
        payload.put("occurredAt", event.getOccurredAt());
        String payloadJson = objectMapper.writeValueAsString(payload);
        String dedupeKey = event.getRequestId() != null
                ? "friend_request_accepted:" + event.getTargetUserId() + ':' + event.getRequestId()
                : null;
        notificationServiceFacade.createBasic(
                event.getTargetUserId(),
                NotificationType.FRIEND_REQUEST_ACCEPTED,
                payloadJson,
                dedupeKey
        );
    }
}
