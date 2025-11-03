package shadowshift.studio.authservice.dto.telegram;

import java.time.LocalDateTime;

public record TelegramLinkResponseDTO(
        String token,
        String deepLinkUrl,
        LocalDateTime expiresAt,
        String botUsername
) {
}
