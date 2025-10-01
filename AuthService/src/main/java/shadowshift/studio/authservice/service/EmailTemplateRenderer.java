package shadowshift.studio.authservice.service;

import shadowshift.studio.authservice.entity.EmailVerification;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Renders email templates from external HTML files located in resources/templates/email.
 * Supports simple {{PLACEHOLDER}} replacement and caching.
 */
public class EmailTemplateRenderer {

    private static final Map<String, String> CACHE = new ConcurrentHashMap<>();

    private static String templatePath(EmailVerification.Purpose purpose) {
        return switch (purpose) {
            case REGISTRATION -> "templates/email/verification_registration.html";
            case PASSWORD_RESET -> "templates/email/verification_password_reset.html";
            case ACCOUNT_DELETION -> "templates/email/verification_account_deletion.html";
        };
    }

    private static String loadTemplate(String path) {
        return CACHE.computeIfAbsent(path, p -> {
            try (InputStream is = EmailTemplateRenderer.class.getClassLoader().getResourceAsStream(p)) {
                if (is == null) return null;
                try (BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                    return br.lines().collect(Collectors.joining("\n"));
                }
            } catch (Exception e) {
                return null;
            }
        });
    }

    public static String renderVerificationEmail(EmailVerification.Purpose purpose, String code, long ttlSeconds) {
        String path = templatePath(purpose);
        String raw = loadTemplate(path);
        if (raw == null) {
            // fallback to inline minimal template
            return "<html><body><p>Код: " + escape(code) + "</p><p>TTL ~" + ttlSeconds/60 + " мин.</p></body></html>";
        }
        long minutes = Math.max(1, ttlSeconds / 60);
        return raw.replace("{{CODE}}", escape(code))
                .replace("{{TTL_MINUTES}}", String.valueOf(minutes));
    }

    public static String renderPlainText(EmailVerification.Purpose purpose, String code, long ttlSeconds) {
        long minutes = Math.max(1, ttlSeconds / 60);
        String header = switch (purpose) {
            case REGISTRATION -> "Подтверждение регистрации";
            case PASSWORD_RESET -> "Сброс пароля";
            case ACCOUNT_DELETION -> "Удаление аккаунта";
        };
        return header + "\nКод: " + code + "\nСрок действия: ~" + minutes + " мин.\nНе делитесь кодом.";
    }

    private static String escape(String s) { return s.replace("<","&lt;").replace(">","&gt;"); }
}