package shadowshift.studio.notificationservice.dto;

import java.time.LocalDateTime;

public record TelegramRecipient(
        Long userId,
        String username,
        String displayName,
        Long chatId,
        boolean notificationsEnabled,
        LocalDateTime linkedAt
) {
    public String displayLabel() {
        if (displayName != null && !displayName.isBlank()) {
            return displayName;
        }
        return username;
    }
}
