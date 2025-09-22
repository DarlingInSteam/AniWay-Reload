package shadowshift.studio.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import shadowshift.studio.authservice.entity.EmailVerification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, UUID> {
    List<EmailVerification> findTop5ByEmailAndStatusAndPurposeOrderByCreatedAtDesc(String email, EmailVerification.Status status, EmailVerification.Purpose purpose);
    List<EmailVerification> findByEmailAndPurposeAndCreatedAtAfter(String email, EmailVerification.Purpose purpose, LocalDateTime after);
    Optional<EmailVerification> findFirstByIdAndStatusAndPurpose(UUID id, EmailVerification.Status status, EmailVerification.Purpose purpose);
    Optional<EmailVerification> findFirstByVerificationTokenAndStatusAndPurpose(String token, EmailVerification.Status status, EmailVerification.Purpose purpose);
}
