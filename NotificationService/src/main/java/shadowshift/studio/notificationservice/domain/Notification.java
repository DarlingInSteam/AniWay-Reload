package shadowshift.studio.notificationservice.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "notifications", indexes = {
        @Index(name = "ix_notifications_user_status_created", columnList = "user_id,status,created_at DESC"),
        @Index(name = "ix_notifications_user_created", columnList = "user_id,created_at DESC"),
        @Index(name = "ix_notifications_dedupe", columnList = "dedupe_key")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 50)
    private NotificationType type;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private NotificationStatus status;

    @Column(name = "payload", columnDefinition = "TEXT")
    private String payloadJson;

    @Column(name = "dedupe_key", length = 120)
    private String dedupeKey;

    @Column(name = "priority", nullable = false)
    private short priority;

    @Column(name = "is_silent", nullable = false)
    private boolean silent;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "version", nullable = false)
    private short version;
}
