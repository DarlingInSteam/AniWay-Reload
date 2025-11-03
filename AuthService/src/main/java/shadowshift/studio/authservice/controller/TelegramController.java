package shadowshift.studio.authservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.authservice.dto.telegram.TelegramLinkResponseDTO;
import shadowshift.studio.authservice.dto.telegram.TelegramLinkStatusDTO;
import shadowshift.studio.authservice.dto.telegram.TelegramToggleRequestDTO;
import shadowshift.studio.authservice.entity.User;
import shadowshift.studio.authservice.service.TelegramLinkService;
import shadowshift.studio.authservice.service.UserService;

@RestController
@RequestMapping("/api/users/me/telegram")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.0.3:3000"})
public class TelegramController {

    private final TelegramLinkService telegramLinkService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<TelegramLinkStatusDTO> getStatus(Authentication authentication) {
        User user = requireUser(authentication);
        TelegramLinkStatusDTO status = telegramLinkService.getStatusForUser(user.getId());
        return ResponseEntity.ok(status);
    }

    @PostMapping("/link")
    public ResponseEntity<TelegramLinkResponseDTO> createLink(Authentication authentication) {
        User user = requireUser(authentication);
        TelegramLinkResponseDTO response = telegramLinkService.generateLinkTokenForUser(user.getId());
        // Не логируем сам токен
        log.info("Telegram link token issued for user {}", user.getId());
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/link")
    public ResponseEntity<Void> unlink(Authentication authentication) {
        User user = requireUser(authentication);
        telegramLinkService.unlinkUser(user.getId(), false);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/notifications")
    public ResponseEntity<TelegramLinkStatusDTO> toggleNotifications(@RequestBody TelegramToggleRequestDTO request,
                                                                     Authentication authentication) {
        User user = requireUser(authentication);
        telegramLinkService.setNotificationsEnabled(user.getId(), request.enabled());
        TelegramLinkStatusDTO status = telegramLinkService.getStatusForUser(user.getId());
        return ResponseEntity.ok(status);
    }

    private User requireUser(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new IllegalArgumentException("Authentication is required");
        }
        User user = userService.findByUsername(authentication.getName());
        if (user == null) {
            throw new IllegalArgumentException("User not found");
        }
        return user;
    }
}
