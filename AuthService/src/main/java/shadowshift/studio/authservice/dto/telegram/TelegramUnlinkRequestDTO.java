package shadowshift.studio.authservice.dto.telegram;

public record TelegramUnlinkRequestDTO(
        Long chatId,
        Long userId,
        String reason,
        boolean disableOnly
) {
}
