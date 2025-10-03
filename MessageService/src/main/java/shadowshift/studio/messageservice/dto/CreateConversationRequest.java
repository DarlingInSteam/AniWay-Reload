package shadowshift.studio.messageservice.dto;

import jakarta.validation.constraints.NotNull;

public record CreateConversationRequest(
        @NotNull Long targetUserId
) {
}
