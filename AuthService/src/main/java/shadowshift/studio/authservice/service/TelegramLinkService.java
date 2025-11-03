package shadowshift.studio.authservice.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;
import shadowshift.studio.authservice.dto.telegram.TelegramConsumeRequestDTO;
import shadowshift.studio.authservice.dto.telegram.TelegramConsumeResponseDTO;
import shadowshift.studio.authservice.dto.telegram.TelegramLinkResponseDTO;
import shadowshift.studio.authservice.dto.telegram.TelegramLinkStatusDTO;
import shadowshift.studio.authservice.dto.telegram.TelegramUserInfoDTO;
import shadowshift.studio.authservice.entity.User;
import shadowshift.studio.authservice.entity.UserTelegramLinkToken;
import shadowshift.studio.authservice.repository.UserRepository;
import shadowshift.studio.authservice.repository.UserTelegramLinkTokenRepository;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramLinkService {

    private final UserRepository userRepository;
    private final UserTelegramLinkTokenRepository tokenRepository;

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${telegram.bot.username:}")
    private String botUsername;

    @Value("${telegram.deep-link-base:https://t.me}")
    private String deepLinkBase;

    @Value("${telegram.link.ttl-minutes:15}")
    private long tokenTtlMinutes;

    @Value("${telegram.link.max-active-tokens:5}")
    private int maxActiveTokens;

    @Value("${telegram.notifications.default-enabled:true}")
    private boolean defaultNotificationsEnabled;

    private static final HexFormat HEX_FORMAT = HexFormat.of();

    public TelegramLinkStatusDTO getStatusForUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        boolean connected = user.getTelegramChatId() != null;
        boolean enabled = Boolean.TRUE.equals(user.getTelegramNotificationsEnabled());
        return new TelegramLinkStatusDTO(connected, enabled, user.getTelegramLinkedAt(), botUsername);
    }

    public Optional<TelegramUserInfoDTO> getInfoForUser(Long userId) {
        return userRepository.findById(userId)
                .map(user -> new TelegramUserInfoDTO(
                        user.getId(),
                        user.getUsername(),
                        user.getDisplayName(),
                        user.getTelegramChatId(),
                        Boolean.TRUE.equals(user.getTelegramNotificationsEnabled()),
                        user.getTelegramLinkedAt()
                ));
    }

    public Optional<TelegramUserInfoDTO> getInfoByChatId(Long chatId) {
        if (chatId == null) return Optional.empty();
        return userRepository.findByTelegramChatId(chatId)
                .map(user -> new TelegramUserInfoDTO(
                        user.getId(),
                        user.getUsername(),
                        user.getDisplayName(),
                        user.getTelegramChatId(),
                        Boolean.TRUE.equals(user.getTelegramNotificationsEnabled()),
                        user.getTelegramLinkedAt()
                ));
    }

    @Transactional
    public TelegramLinkResponseDTO generateLinkTokenForUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        ensureBotConfigured();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusMinutes(tokenTtlMinutes);

        cleanupExpiredTokens(now);

        // Limit active tokens per user by pruning oldest entries
        List<UserTelegramLinkToken> activeTokens = tokenRepository.findByUser_IdAndUsedAtIsNullOrderByCreatedAtAsc(userId);
        long stillActive = activeTokens.stream().filter(t -> !t.isExpired(now)).count();
        if (stillActive >= maxActiveTokens && !activeTokens.isEmpty()) {
            int toRemove = (int) (stillActive - maxActiveTokens + 1);
            for (UserTelegramLinkToken token : activeTokens) {
                if (toRemove <= 0) break;
                if (!token.isExpired(now)) {
                    tokenRepository.delete(token);
                    toRemove--;
                }
            }
        }

        String plainToken = generateToken();
        String tokenHash = hashToken(plainToken);

        UserTelegramLinkToken entity = UserTelegramLinkToken.builder()
                .user(user)
                .tokenHash(tokenHash)
                .expiresAt(expiresAt)
                .build();
        tokenRepository.save(entity);

        String deepLinkUrl = buildDeepLink(plainToken);
        log.info("Generated Telegram link token for user {} expiring at {}", userId, expiresAt);
        return new TelegramLinkResponseDTO(plainToken, deepLinkUrl, expiresAt, botUsername);
    }

    @Transactional
    public void unlinkUser(Long userId, boolean disableOnly) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!disableOnly) {
            user.setTelegramChatId(null);
            user.setTelegramLinkedAt(null);
        }
        user.setTelegramNotificationsEnabled(false);
        tokenRepository.deleteAllByUserId(userId);
        userRepository.save(user);
        log.info("Telegram {} for user {}", disableOnly ? "notifications disabled" : "unlinked", userId);
    }

    @Transactional
    public void unlinkByChatId(Long chatId, boolean disableOnly, String reason) {
        if (chatId == null) return;
        userRepository.findByTelegramChatId(chatId).ifPresent(user -> {
            if (!disableOnly) {
                user.setTelegramChatId(null);
                user.setTelegramLinkedAt(null);
            }
            user.setTelegramNotificationsEnabled(false);
            tokenRepository.deleteAllByUserId(user.getId());
            userRepository.save(user);
            log.info("Telegram {} by chat {} (user {}), reason={} ", disableOnly ? "notifications disabled" : "unlinked", chatId, user.getId(), reason);
        });
    }

    @Transactional
    public TelegramConsumeResponseDTO consumeLinkToken(TelegramConsumeRequestDTO request) {
        Assert.isTrue(StringUtils.hasText(request.token()), "token must not be empty");
        ensureBotConfigured();

        String tokenHash = hashToken(request.token());
        LocalDateTime now = LocalDateTime.now();

        Optional<UserTelegramLinkToken> tokenOpt = tokenRepository.findByTokenHash(tokenHash);
        if (tokenOpt.isEmpty()) {
            log.warn("Attempt to consume unknown Telegram token");
            return new TelegramConsumeResponseDTO(false, "Ссылка недействительна или устарела", null, null, false);
        }
        UserTelegramLinkToken token = tokenOpt.get();
        if (token.isUsed()) {
            log.warn("Attempt to reuse Telegram token for user {}", token.getUser().getId());
            return new TelegramConsumeResponseDTO(false, "Эта ссылка уже была использована", null, null, false);
        }
        if (token.isExpired(now)) {
            log.warn("Expired Telegram token for user {}", token.getUser().getId());
            tokenRepository.delete(token); // cleanup
            return new TelegramConsumeResponseDTO(false, "Срок действия ссылки истёк. Сгенерируйте новую на сайте.", null, null, false);
        }

        Long chatId = request.chatId();
        if (chatId == null) {
            return new TelegramConsumeResponseDTO(false, "Не удалось определить идентификатор чата", null, null, false);
        }

        // If this chat was previously linked to another user, detach it
        userRepository.findByTelegramChatId(chatId)
                .filter(other -> !other.getId().equals(token.getUser().getId()))
                .ifPresent(other -> {
                    other.setTelegramChatId(null);
                    other.setTelegramNotificationsEnabled(false);
                    other.setTelegramLinkedAt(null);
                    userRepository.save(other);
                    log.info("Reassigning Telegram chat {} from user {} to user {}", chatId, other.getId(), token.getUser().getId());
                });

        User user = token.getUser();
        user.setTelegramChatId(chatId);
        user.setTelegramLinkedAt(now);
        user.setTelegramNotificationsEnabled(defaultNotificationsEnabled);
        userRepository.save(user);

        token.setUsedAt(now);
        tokenRepository.save(token);
        cleanupExpiredTokens(now);

        // remove other outstanding tokens for this user to reduce attack surface
        tokenRepository.findByUser_IdAndUsedAtIsNullOrderByCreatedAtAsc(user.getId()).stream()
                .filter(t -> !t.getId().equals(token.getId()))
                .forEach(tokenRepository::delete);

        String displayName = Optional.ofNullable(user.getDisplayName()).filter(StringUtils::hasText)
                .orElse(user.getUsername());
        return new TelegramConsumeResponseDTO(true, "Telegram успешно привязан", user.getId(), displayName, true);
    }

    @Transactional
    public void setNotificationsEnabled(Long userId, boolean enabled) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (user.getTelegramChatId() == null && enabled) {
            throw new IllegalStateException("Telegram not linked");
        }
        user.setTelegramNotificationsEnabled(enabled);
        userRepository.save(user);
        log.info("Telegram notifications {} for user {}", enabled ? "enabled" : "disabled", userId);
    }

    private String buildDeepLink(String token) {
        String base = deepLinkBase;
        if (!StringUtils.hasText(base)) {
            base = "https://t.me";
        }
        if (!base.startsWith("http")) {
            base = "https://" + base;
        }
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        String username = botUsername.startsWith("@") ? botUsername.substring(1) : botUsername;
        return base + "/" + username + "?start=" + token;
    }

    private void cleanupExpiredTokens(LocalDateTime now) {
        tokenRepository.deleteExpired(now);
    }

    private void ensureBotConfigured() {
        if (!StringUtils.hasText(botUsername)) {
            throw new IllegalStateException("telegram.bot.username is not configured");
        }
    }

    private String generateToken() {
        byte[] bytes = new byte[24];
        secureRandom.nextBytes(bytes);
        return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            return HEX_FORMAT.formatHex(hash).toLowerCase(Locale.ROOT);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}
