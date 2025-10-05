package shadowshift.studio.notificationservice.messaging;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class FriendNotificationEvent {
    private FriendNotificationEventType type;
    private Long targetUserId;
    private Long requesterId;
    private Long accepterId;
    private UUID requestId;
    private String message;
    private Instant occurredAt;
}
