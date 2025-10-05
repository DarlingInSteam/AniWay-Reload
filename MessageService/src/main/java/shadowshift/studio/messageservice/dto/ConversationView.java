package shadowshift.studio.messageservice.dto;

import shadowshift.studio.messageservice.model.ConversationType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record ConversationView(
        UUID id,
        ConversationType type,
        Long categoryId,
        String categoryTitle,
        List<Long> participantIds,
        MessageView lastMessage,
        long unreadCount,
        LocalDateTime createdAt,
        LocalDateTime lastMessageAt
) {
}
