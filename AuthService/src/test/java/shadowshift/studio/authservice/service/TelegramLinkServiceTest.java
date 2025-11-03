package shadowshift.studio.authservice.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import shadowshift.studio.authservice.dto.telegram.TelegramConsumeRequestDTO;
import shadowshift.studio.authservice.dto.telegram.TelegramConsumeResponseDTO;
import shadowshift.studio.authservice.dto.telegram.TelegramLinkResponseDTO;
import shadowshift.studio.authservice.entity.User;
import shadowshift.studio.authservice.repository.UserRepository;
import shadowshift.studio.authservice.repository.UserTelegramLinkTokenRepository;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TelegramLinkService.class)
@TestPropertySource(properties = {
        "telegram.bot.username=aniwaynotify_bot",
        "telegram.deep-link-base=https://t.me",
        "telegram.link.ttl-minutes=15",
        "telegram.link.max-active-tokens=5",
        "telegram.notifications.default-enabled=true"
})
class TelegramLinkServiceTest {

    @Autowired
    private TelegramLinkService telegramLinkService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserTelegramLinkTokenRepository tokenRepository;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .username("tester")
                .email("tester@example.com")
                .password("secret")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .isEnabled(true)
                .isAccountNonExpired(true)
                .isAccountNonLocked(true)
                .isCredentialsNonExpired(true)
                .build();
        user = userRepository.save(user);
    }

    @Test
    void generateAndConsumeTokenFlow() {
        TelegramLinkResponseDTO link = telegramLinkService.generateLinkTokenForUser(user.getId());

        assertThat(link.token()).isNotBlank();
        assertThat(link.deepLinkUrl()).contains("aniwaynotify_bot?start=");
        assertThat(link.expiresAt()).isAfter(LocalDateTime.now());

        // Ensure token stored hashed (no plain token in DB)
        var storedToken = tokenRepository.findAll().getFirst();
        assertThat(storedToken.getTokenHash()).isNotEqualTo(link.token());
        assertThat(storedToken.getTokenHash()).hasSize(64);

        TelegramConsumeRequestDTO consumeRequest = new TelegramConsumeRequestDTO(
                link.token(),
                123456789L,
                "tester_chat",
                "Test",
                "User",
                "ru"
        );

        TelegramConsumeResponseDTO response = telegramLinkService.consumeLinkToken(consumeRequest);

        assertThat(response.success()).isTrue();
        assertThat(response.displayName()).isEqualTo("tester");
        assertThat(response.notificationsEnabled()).isTrue();

        User updated = userRepository.findById(user.getId()).orElseThrow();
        assertThat(updated.getTelegramChatId()).isEqualTo(123456789L);
        assertThat(updated.getTelegramLinkedAt()).isNotNull();
        assertThat(updated.getTelegramNotificationsEnabled()).isTrue();

        // Token should be marked used
        var token = tokenRepository.findAll().getFirst();
        assertThat(token.getUsedAt()).isNotNull();
    }
}
