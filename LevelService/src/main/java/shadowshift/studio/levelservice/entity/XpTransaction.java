package shadowshift.studio.levelservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "xp_transaction", indexes = {
        @Index(name = "idx_event_id", columnList = "eventId", unique = true),
        @Index(name = "idx_user_id", columnList = "userId")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class XpTransaction {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    private Long userId;

    private String sourceType; // LIKE_RECEIVED, CHAPTER_READ, BADGE_AWARDED
    private String sourceId;   // commentId, chapterId, badgeId etc.

    private long xpAmount;
    private String eventId; // idempotency key from event message

    private LocalDateTime createdAt;
}
