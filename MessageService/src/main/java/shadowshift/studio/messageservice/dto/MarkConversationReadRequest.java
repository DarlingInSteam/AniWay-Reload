package shadowshift.studio.messageservice.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record MarkConversationReadRequest(
        @NotNull UUID lastMessageId
) {
}
