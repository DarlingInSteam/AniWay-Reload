package shadowshift.studio.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import shadowshift.studio.authservice.entity.EmailVerification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EmailVerificationRepository extends JpaRepository<EmailVerification, UUID> {
    List<EmailVerification> findTop5ByEmailAndStatusOrderByCreatedAtDesc(String email, EmailVerification.Status status);
    List<EmailVerification> findByEmailAndCreatedAtAfter(String email, LocalDateTime after);
    Optional<EmailVerification> findFirstByIdAndStatus(UUID id, EmailVerification.Status status);
    Optional<EmailVerification> findFirstByVerificationTokenAndStatus(String token, EmailVerification.Status status);
}
