package shadowshift.studio.friendservice.notification;

import lombok.Builder;
import lombok.Value;

import java.time.Instant;
import java.util.UUID;

@Value
@Builder
public class FriendNotificationEvent {
    FriendNotificationEventType type;
    Long targetUserId;
    Long requesterId;
    Long accepterId;
    UUID requestId;
    String message;
    Instant occurredAt;
}
