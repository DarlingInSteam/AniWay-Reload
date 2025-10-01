package shadowshift.studio.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import shadowshift.studio.authservice.entity.EmailVerification;
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
    public void sendVerificationCode(String email, String code, EmailVerification.Purpose purpose, long ttlSeconds) {
        if (!enabled) {
            log.info("Email sending disabled. Supposed to send code {} to {} purpose {}", code, email, purpose);
            return;
        }
        try {
            String subject = switch (purpose) {
                case REGISTRATION -> "AniWay · Подтверждение регистрации";
                case PASSWORD_RESET -> "AniWay · Сброс пароля";
                case ACCOUNT_DELETION -> "AniWay · Подтверждение удаления аккаунта";
                case LOGIN -> "AniWay · Код входа";
            };

            String html = EmailTemplateRenderer.renderVerificationEmail(purpose, code, ttlSeconds);
            // Fallback plain text
            String plain = EmailTemplateRenderer.renderPlainText(purpose, code, ttlSeconds);
            MimeMessage mime = mailSender.createMimeMessage();
            // multipart=true to allow alternative HTML + plain text
            MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
            helper.setFrom(from);
            helper.setTo(email);
            helper.setSubject(subject);
            helper.setText(plain, html); // plain as fallback, html as rich
            mailSender.send(mime);
            log.info("Verification code (purpose {}) sent to {}", purpose, email);
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", email, e.getMessage(), e);
            throw new IllegalStateException("EMAIL_SEND_FAILED");
        }
    }
}
