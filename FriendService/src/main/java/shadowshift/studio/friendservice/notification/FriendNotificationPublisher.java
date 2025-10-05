package shadowshift.studio.friendservice.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class FriendNotificationPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Value("${friend.notifications.exchange:notifications.friend.exchange}")
    private String exchange;

    @Value("${friend.notifications.routing-key:notifications.friend.event}")
    private String routingKey;

    public void publishFriendRequestReceived(Long targetUserId, Long requesterId, UUID requestId, String message) {
        if (targetUserId == null || targetUserId <= 0) {
            return;
        }
        FriendNotificationEvent event = FriendNotificationEvent.builder()
                .type(FriendNotificationEventType.REQUEST_RECEIVED)
                .targetUserId(targetUserId)
                .requesterId(requesterId)
                .requestId(requestId)
                .message(message)
                .occurredAt(Instant.now())
                .build();
        send(event);
    }

    public void publishFriendRequestAccepted(Long requesterId, Long accepterId, UUID requestId) {
        if (requesterId == null || requesterId <= 0) {
            return;
        }
        FriendNotificationEvent event = FriendNotificationEvent.builder()
                .type(FriendNotificationEventType.REQUEST_ACCEPTED)
                .targetUserId(requesterId)
        .requesterId(requesterId)
                .accepterId(accepterId)
                .requestId(requestId)
                .occurredAt(Instant.now())
                .build();
        send(event);
    }

    private void send(FriendNotificationEvent event) {
        try {
            rabbitTemplate.convertAndSend(exchange, routingKey, event);
        } catch (AmqpException ex) {
            log.warn("Не удалось отправить событие {}: {}", event.getType(), ex.getMessage());
        }
    }
}
