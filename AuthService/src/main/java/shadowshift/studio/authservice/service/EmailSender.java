package shadowshift.studio.authservice.service;

import shadowshift.studio.authservice.entity.EmailVerification;

public interface EmailSender {
    void sendVerificationCode(String email, String code, EmailVerification.Purpose purpose, long ttlSeconds);
}
