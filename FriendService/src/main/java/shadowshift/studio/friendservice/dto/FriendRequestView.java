package shadowshift.studio.friendservice.dto;

import java.time.Instant;
import java.util.UUID;

public record FriendRequestView(
        UUID id,
        Long requesterId,
        Long receiverId,
        String status,
        String message,
        Instant createdAt,
        Instant updatedAt,
        Instant respondedAt
) {}
