package shadowshift.studio.authservice.service;

public interface EmailSender {
    void sendVerificationCode(String email, String code);
}
