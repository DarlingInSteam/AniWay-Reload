package shadowshift.studio.authservice.dto.telegram;

public record TelegramConsumeResponseDTO(
        boolean success,
        String message,
        Long userId,
        String displayName,
        boolean notificationsEnabled
) {
}
