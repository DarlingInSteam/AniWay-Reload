package shadowshift.studio.authservice.dto.telegram;

import java.time.LocalDateTime;

public record TelegramLinkStatusDTO(
        boolean connected,
        boolean notificationsEnabled,
        LocalDateTime linkedAt,
        String botUsername
) {
}
