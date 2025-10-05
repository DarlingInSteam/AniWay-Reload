package shadowshift.studio.messageservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record SendChannelMessageRequest(
        @NotBlank @Size(max = 2000) String content,
        UUID replyToMessageId
) {
}
