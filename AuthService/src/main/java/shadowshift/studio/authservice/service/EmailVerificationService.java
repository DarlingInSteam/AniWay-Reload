package shadowshift.studio.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.authservice.entity.EmailVerification;
import shadowshift.studio.authservice.repository.EmailVerificationRepository;
import shadowshift.studio.authservice.repository.UserRepository;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailVerificationService {

    private final EmailVerificationRepository emailVerificationRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailSender emailSender;

    private final SecureRandom random = new SecureRandom();

    @Value("${email.verification.code.length:6}")
    private int codeLength;
    @Value("${email.verification.code.ttl-seconds:600}")
    private long codeTtlSeconds;
    @Value("${email.verification.attempts.max:5}")
    private int maxAttempts;
    @Value("${email.verification.rate.per-email-hour:5}")
    private int perEmailHour;
    @Value("${email.verification.rate.per-ip-hour:30}")
    private int perIpHour; // reserved for future (need ip store)

    public String generateCode() {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < codeLength; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }

    @Transactional
    public EmailVerification requestCode(String email) {
        String normEmail = email.trim().toLowerCase();

        // Rate limiting per email last hour
        LocalDateTime hourAgo = LocalDateTime.now().minusHours(1);
        List<EmailVerification> lastHour = emailVerificationRepository.findByEmailAndCreatedAtAfter(normEmail, hourAgo);
        if (lastHour.size() >= perEmailHour) {
            throw new IllegalArgumentException("RATE_LIMIT_EMAIL");
        }

        // If already registered and verified -> we can still allow (UX), but mark flag
        if (userRepository.existsByEmail(normEmail)) {
            log.info("Request code for existing email {}", normEmail);
        }

        String code = generateCode();
        String hash = passwordEncoder.encode(code);
        EmailVerification verification = EmailVerification.builder()
                .email(normEmail)
                .codeHash(hash)
                .expiresAt(LocalDateTime.now().plusSeconds(codeTtlSeconds))
                .status(EmailVerification.Status.ACTIVE)
                .attemptsRemaining(maxAttempts)
                .sendCount(1)
                .build();
        verification = emailVerificationRepository.save(verification);

        emailSender.sendVerificationCode(normEmail, code);

        return verification;
    }

    @Transactional
    public String verifyCode(UUID requestId, String code) {
        EmailVerification verification = emailVerificationRepository.findFirstByIdAndStatus(requestId, EmailVerification.Status.ACTIVE)
                .orElseThrow(() -> new IllegalArgumentException("INVALID_REQUEST"));

        if (verification.isExpired()) {
            verification.setStatus(EmailVerification.Status.EXPIRED);
            emailVerificationRepository.save(verification);
            throw new IllegalArgumentException("CODE_EXPIRED");
        }

        if (verification.getAttemptsRemaining() <= 0) {
            verification.setStatus(EmailVerification.Status.FAILED);
            emailVerificationRepository.save(verification);
            throw new IllegalArgumentException("NO_ATTEMPTS");
        }

        verification.setAttemptsRemaining(verification.getAttemptsRemaining() - 1);

        if (!passwordEncoder.matches(code, verification.getCodeHash())) {
            emailVerificationRepository.save(verification);
            throw new IllegalArgumentException("CODE_INVALID");
        }

        verification.setStatus(EmailVerification.Status.VERIFIED);
        verification.setVerifiedAt(LocalDateTime.now());
        // Create one-time short token (UUID) kept in DB; could be replaced with signed JWT
        String token = UUID.randomUUID().toString();
        verification.setVerificationToken(token);
        emailVerificationRepository.save(verification);
        return token;
    }

    public String consumeVerificationToken(String token) {
        Optional<EmailVerification> opt = emailVerificationRepository.findFirstByVerificationTokenAndStatus(token, EmailVerification.Status.VERIFIED);
        EmailVerification verification = opt.orElseThrow(() -> new IllegalArgumentException("TOKEN_INVALID"));
        if (verification.isExpired()) {
            throw new IllegalArgumentException("TOKEN_EXPIRED");
        }
        return verification.getEmail();
    }

    @Transactional
    public void markEmailUsed(String email) {
        // Future: invalidate other active tokens for this email
        log.debug("Email {} marked as used", email);
    }

    public long getRemainingTtlSeconds(EmailVerification v) {
        return Math.max(0, Duration.between(LocalDateTime.now(), v.getExpiresAt()).toSeconds());
    }
}
