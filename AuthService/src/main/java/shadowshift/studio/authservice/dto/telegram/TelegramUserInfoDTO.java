package shadowshift.studio.authservice.dto.telegram;

import java.time.LocalDateTime;

public record TelegramUserInfoDTO(
        Long userId,
        String username,
        String displayName,
        Long chatId,
        boolean notificationsEnabled,
        LocalDateTime linkedAt
) {
}
