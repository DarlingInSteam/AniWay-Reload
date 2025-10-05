package shadowshift.studio.friendservice.dto;

import java.time.Instant;
import java.util.UUID;

public record FriendView(
        Long friendUserId,
        Instant since,
        UUID sourceRequestId
) {}
