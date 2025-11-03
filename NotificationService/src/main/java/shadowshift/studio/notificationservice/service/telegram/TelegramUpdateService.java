package shadowshift.studio.notificationservice.service.telegram;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import shadowshift.studio.notificationservice.dto.TelegramConsumeResponse;
import shadowshift.studio.notificationservice.dto.TelegramRecipient;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramUpdateService {

    private final TelegramBotClient telegramBotClient;
    private final AuthServiceTelegramClient authServiceTelegramClient;

    public void handleUpdate(JsonNode update) {
        if (update == null || update.isMissingNode()) {
            return;
        }
        if (update.has("message")) {
            handleMessage(update.get("message"));
            return;
        }
        if (update.has("my_chat_member")) {
            handleChatMemberUpdate(update.get("my_chat_member"));
            return;
        }
        if (update.has("chat_member")) {
            handleChatMemberUpdate(update.get("chat_member"));
        }
    }

    private void handleMessage(JsonNode message) {
        if (message == null || message.isMissingNode()) {
            return;
        }
        JsonNode chat = message.path("chat");
        Long chatId = chat.isMissingNode() || !chat.has("id") ? null : chat.path("id").asLong();
        if (chatId == null) {
            return;
        }
        String text = message.path("text").asText(null);
        if (!StringUtils.hasText(text)) {
            return;
        }
        String trimmed = text.trim();
        if (isCommand(trimmed, "/start")) {
            handleStartCommand(chatId, message, extractStartToken(trimmed));
        } else if (isCommand(trimmed, "/stop")) {
            handleStopCommand(chatId);
        } else if (isCommand(trimmed, "/help")) {
            sendHelp(chatId);
        }
    }

    private void handleChatMemberUpdate(JsonNode body) {
        if (body == null || body.isMissingNode()) {
            return;
        }
        JsonNode chat = body.path("chat");
        if (!chat.has("id")) {
            return;
        }
        long chatId = chat.path("id").asLong();
        JsonNode newMember = body.path("new_chat_member");
        String status = newMember.path("status").asText("");
        if ("kicked".equalsIgnoreCase(status) || "left".equalsIgnoreCase(status)) {
            authServiceTelegramClient.unlinkByChat(chatId, "TELEGRAM_BLOCKED");
        }
    }

    private void handleStartCommand(Long chatId, JsonNode message, String token) {
        if (!StringUtils.hasText(token)) {
            telegramBotClient.sendMessage(chatId, "Эта ссылка больше не действует. Сгенерируйте новую в настройках профиля AniWay.");
            return;
        }
        JsonNode chat = message.path("chat");
        JsonNode from = message.path("from");

        String chatUsername = firstNonBlank(chat.path("username").asText(null), from.path("username").asText(null));
        String firstName = from.path("first_name").asText(null);
        String lastName = from.path("last_name").asText(null);
        String languageCode = from.path("language_code").asText(null);

        Optional<TelegramConsumeResponse> responseOpt = authServiceTelegramClient.consumeToken(
                token,
                chatId,
                chatUsername,
                firstName,
                lastName,
                languageCode
        );
        if (responseOpt.isEmpty()) {
            telegramBotClient.sendMessage(chatId, "Не удалось подтвердить привязку. Попробуйте ещё раз позднее.");
            return;
        }
        TelegramConsumeResponse response = responseOpt.get();
        if (response.success()) {
            StringBuilder sb = new StringBuilder();
            if (StringUtils.hasText(response.message())) {
                sb.append(response.message());
            } else {
                sb.append("Telegram успешно привязан.");
            }
            if (response.notificationsEnabled()) {
                sb.append("\nУведомления о новых главах включены. Управлять настройками можно на сайте AniWay.");
            } else {
                sb.append("\nУведомления сейчас выключены. Их можно включить в настройках профиля.");
            }
            telegramBotClient.sendMessage(chatId, sb.toString());
        } else {
            String messageText = StringUtils.hasText(response.message())
                    ? response.message()
                    : "Срок действия ссылки истёк. Сгенерируйте новую на сайте.";
            telegramBotClient.sendMessage(chatId, messageText);
        }
    }

    private void handleStopCommand(Long chatId) {
        Optional<TelegramRecipient> recipientOpt = authServiceTelegramClient.getRecipientByChatId(chatId);
        if (recipientOpt.isPresent()) {
            TelegramRecipient recipient = recipientOpt.get();
            authServiceTelegramClient.disableNotifications(recipient.userId(), "USER_STOP_COMMAND");
            telegramBotClient.sendMessage(chatId, "Хорошо, уведомления отключены. Вернуть их можно в настройках профиля на AniWay.");
        } else {
            // Chat linked earlier but record already missing — ensure cleanup just in case
            authServiceTelegramClient.unlinkByChat(chatId, "USER_STOP_NO_LINK");
            telegramBotClient.sendMessage(chatId, "Связь с аккаунтом не найдена. Сгенерируйте новую ссылку на сайте AniWay, чтобы подключить уведомления.");
        }
    }

    private void sendHelp(Long chatId) {
        telegramBotClient.sendMessage(chatId, "Этот бот отправляет уведомления о новых главах с AniWay.\n\n1. Зайдите в настройки профиля на сайте и нажмите \"Подключить Telegram\".\n2. Откройте сгенерированную ссылку /start token.\n3. Командой /stop можно временно отключить уведомления.");
    }

    private boolean isCommand(String text, String command) {
        if (!StringUtils.hasText(text) || !text.startsWith("/")) {
            return false;
        }
        String firstToken = firstSegment(text);
        String base = firstToken.contains("@") ? firstToken.substring(0, firstToken.indexOf('@')) : firstToken;
        return base.equalsIgnoreCase(command);
    }

    private String extractStartToken(String text) {
        if (!StringUtils.hasText(text)) {
            return null;
        }
        int spaceIdx = text.indexOf(' ');
        if (spaceIdx < 0) {
            return null;
        }
        String remainder = text.substring(spaceIdx + 1).trim();
        if (!StringUtils.hasText(remainder)) {
            return null;
        }
        String[] parts = remainder.split("\\s+");
        return parts.length > 0 ? parts[0] : null;
    }

    private String firstSegment(String text) {
        String trimmed = text.trim();
        int spaceIdx = trimmed.indexOf(' ');
        if (spaceIdx < 0) {
            int newlineIdx = trimmed.indexOf('\n');
            if (newlineIdx < 0) {
                return trimmed;
            }
            return trimmed.substring(0, newlineIdx);
        }
        return trimmed.substring(0, spaceIdx);
    }

    private String firstNonBlank(String primary, String fallback) {
        if (StringUtils.hasText(primary)) {
            return primary;
        }
        if (StringUtils.hasText(fallback)) {
            return fallback;
        }
        return null;
    }
}
