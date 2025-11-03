package shadowshift.studio.authservice.dto.telegram;

public record TelegramConsumeRequestDTO(
        String token,
        Long chatId,
        String chatUsername,
        String firstName,
        String lastName,
        String languageCode
) {
}
