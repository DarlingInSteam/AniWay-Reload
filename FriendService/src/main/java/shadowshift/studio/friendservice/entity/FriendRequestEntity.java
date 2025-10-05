package shadowshift.studio.friendservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import shadowshift.studio.friendservice.model.FriendRequestStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "friend_requests",
        uniqueConstraints = @UniqueConstraint(name = "uk_friend_request_pending", columnNames = {"requester_id", "receiver_id", "status"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FriendRequestEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "requester_id", nullable = false)
    private Long requesterId;

    @Column(name = "receiver_id", nullable = false)
    private Long receiverId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private FriendRequestStatus status;

    @Column(name = "context", length = 512)
    private String context;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "responded_at")
    private OffsetDateTime respondedAt;

    public boolean isPending() {
        return status == FriendRequestStatus.PENDING;
    }

    public void markAccepted() {
        this.status = FriendRequestStatus.ACCEPTED;
        this.respondedAt = OffsetDateTime.now();
    }

    public void markDeclined() {
        this.status = FriendRequestStatus.DECLINED;
        this.respondedAt = OffsetDateTime.now();
    }

    public void markCancelled() {
        this.status = FriendRequestStatus.CANCELLED;
        this.respondedAt = OffsetDateTime.now();
    }
}
