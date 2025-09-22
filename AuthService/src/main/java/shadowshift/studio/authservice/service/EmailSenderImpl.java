package shadowshift.studio.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailSenderImpl implements EmailSender {

    private final JavaMailSender mailSender;

    @Value("${email.verification.from:noreply@aniway.space}")
    private String from;

    @Value("${email.verification.enabled:true}")
    private boolean enabled;

    @Override
    public void sendVerificationCode(String email, String code) {
        if (!enabled) {
            log.info("Email sending disabled. Supposed to send code {} to {}", code, email);
            return;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(email);
            message.setSubject("Ваш код подтверждения AniWay");
            message.setText("Ваш код подтверждения: " + code + "\nОн истекает через 10 минут. Если вы не запрашивали код – проигнорируйте это письмо.");
            mailSender.send(message);
            log.info("Verification code sent to {}", email);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", email, e.getMessage());
            throw new IllegalStateException("EMAIL_SEND_FAILED");
        }
    }
}
