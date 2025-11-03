package shadowshift.studio.notificationservice.web;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import shadowshift.studio.notificationservice.service.telegram.TelegramUpdateService;

@RestController
@RequestMapping("/telegram")
@RequiredArgsConstructor
@Slf4j
public class TelegramWebhookController {

    private final TelegramUpdateService telegramUpdateService;

    @Value("${telegram.webhook.secret:}")
    private String webhookSecret;

    @PostMapping("/webhook")
    public ResponseEntity<Void> receiveUpdate(@RequestBody JsonNode update,
                                               @RequestHeader(value = "X-Telegram-Bot-Api-Secret-Token", required = false) String secretHeader) {
        if (StringUtils.hasText(webhookSecret)) {
            if (!webhookSecret.equals(secretHeader)) {
                log.warn("Rejected Telegram webhook due to invalid secret token");
                return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
            }
        }
        telegramUpdateService.handleUpdate(update);
        return ResponseEntity.ok().build();
    }
}
