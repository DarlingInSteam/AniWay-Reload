package shadowshift.studio.levelservice.events;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

public class XpEvents {

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LikeReceivedEvent {
        private String eventId;      // UUID string
        private Instant occurredAt;
        private Long receiverUserId; // user who receives XP
        private Long actorUserId;    // user who liked (for potential analytics)
        private Long commentId;      // or postId etc.
        private String sourceType;   // COMMENT or POST
        private String reactionType; // LIKE only currently
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChapterReadEvent {
        private String eventId;
        private Instant occurredAt;
        private Long userId;
        private Long chapterId;
        private Long mangaId;
    }

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BadgeAwardedEvent {
        private String eventId;
        private Instant occurredAt;
        private Long userId;
        private String badgeCode; // symbolic code
    }

    public static String newEventId() {
        return UUID.randomUUID().toString();
    }
}
