package shadowshift.studio.authservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.authservice.dto.telegram.TelegramConsumeRequestDTO;
import shadowshift.studio.authservice.dto.telegram.TelegramConsumeResponseDTO;
import shadowshift.studio.authservice.dto.telegram.TelegramUnlinkRequestDTO;
import shadowshift.studio.authservice.dto.telegram.TelegramUserInfoDTO;
import shadowshift.studio.authservice.service.TelegramLinkService;

@RestController
@RequestMapping("/internal/telegram")
@RequiredArgsConstructor
@Slf4j
public class InternalTelegramController {

    private final TelegramLinkService telegramLinkService;

    @PostMapping("/consume")
    public ResponseEntity<TelegramConsumeResponseDTO> consume(@RequestBody TelegramConsumeRequestDTO request) {
        TelegramConsumeResponseDTO response = telegramLinkService.consumeLinkToken(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/unlink")
    public ResponseEntity<Void> unlink(@RequestBody TelegramUnlinkRequestDTO request) {
        if (request.userId() != null) {
            telegramLinkService.unlinkUser(request.userId(), request.disableOnly());
        } else {
            telegramLinkService.unlinkByChatId(request.chatId(), request.disableOnly(), request.reason());
        }
        log.info("Internal unlink for telegram chat={} user={} reason={}", request.chatId(), request.userId(), request.reason());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<TelegramUserInfoDTO> getUserInfo(@PathVariable Long userId) {
        return telegramLinkService.getInfoForUser(userId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/chat/{chatId}")
    public ResponseEntity<TelegramUserInfoDTO> getUserInfoByChat(@PathVariable Long chatId) {
        return telegramLinkService.getInfoByChatId(chatId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
