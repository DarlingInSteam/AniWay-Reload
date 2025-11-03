package shadowshift.studio.notificationservice.dto;

public record TelegramConsumeResponse(
        boolean success,
        String message,
        Long userId,
        String displayName,
        boolean notificationsEnabled
) {
}
