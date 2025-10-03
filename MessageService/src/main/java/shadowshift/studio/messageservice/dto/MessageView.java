package shadowshift.studio.messageservice.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record MessageView(
        UUID id,
        Long senderId,
        String content,
        UUID replyToMessageId,
        LocalDateTime createdAt,
        LocalDateTime editedAt
) {
}
