package shadowshift.studio.authservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "email_verification", indexes = {
    @Index(name = "idx_email_verification_email", columnList = "email"),
    @Index(name = "idx_email_verification_status", columnList = "status"),
    @Index(name = "idx_email_verification_purpose", columnList = "purpose")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailVerification {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, length = 200)
    private String email;

    @Column(nullable = false, length = 120)
    private String codeHash;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Purpose purpose; // REGISTRATION, PASSWORD_RESET, ACCOUNT_DELETION

    @Column(nullable = false)
    private int attemptsRemaining;

    @Column(nullable = false)
    private int sendCount;

    private LocalDateTime verifiedAt;

    private String verificationToken; // one-time short lived token (JWT id or opaque)

    @CreationTimestamp
    private LocalDateTime createdAt;

    public enum Status { ACTIVE, VERIFIED, FAILED, EXPIRED }
    public enum Purpose { REGISTRATION, PASSWORD_RESET, ACCOUNT_DELETION }

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }
}
