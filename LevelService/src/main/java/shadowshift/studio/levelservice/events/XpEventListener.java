package shadowshift.studio.levelservice.events;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import shadowshift.studio.levelservice.entity.UserXp;
import shadowshift.studio.levelservice.service.LevelServiceDomain;
import shadowshift.studio.levelservice.service.BadgeEvaluationService;
import shadowshift.studio.levelservice.entity.UserBadge;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class XpEventListener {

    private final ObjectMapper objectMapper;
    private final LevelServiceDomain levelServiceDomain;
    private final BadgeEvaluationService badgeEvaluationService;

    @Value("${leveling.xp.likeReceived:2}")
    private long likeReceivedXp;

    @Value("${leveling.xp.chapterRead:1}")
    private long chapterReadXp;

    @Value("${leveling.xp.badgeAwarded:25}")
    private long badgeAwardedXp;

    @Value("${leveling.xp.postUpvoted:2}")
    private long postUpvotedXp;

    @Value("${leveling.xp.chapterLikeReceived:2}")
    private long chapterLikeReceivedXp;

    // Comment creation no longer grants XP (abuse prevention). Keep config for clarity but ignore value (force 0).
    @Value("${leveling.xp.commentCreated:0}")
    private long commentCreatedXp; // retained only so existing property doesn't cause confusion if set; we won't use this value

    @Value("${leveling.xp.forumThreadLikeReceived:2}")
    private long forumThreadLikeReceivedXp;

    @Value("${leveling.xp.forumPostLikeReceived:2}")
    private long forumPostLikeReceivedXp;

    @Value("${leveling.xp.reviewLikeReceived:2}")
    private long reviewLikeReceivedXp;

    // Simple dynamic routing: messages contain a type field
    @RabbitListener(queues = "xp.events.queue")
    public void handle(@Payload Map<String, Object> message) {
        try {
            String type = (String) message.get("type");
            String eventId = (String) message.get("eventId");
            switch (type) {
                case "LIKE_RECEIVED" -> handleLikeReceived(message, eventId);
                case "CHAPTER_READ" -> handleChapterRead(message, eventId);
                case "chapter_read" -> handleChapterRead(message, eventId); // lowercase variant safeguard
                case "CHAPTER_COMPLETED", "CHAPTER_FINISHED", "CHAPTER_VIEWED" -> {
                    // Accept legacy/alternative producer event names and treat uniformly.
                    handleChapterRead(message, eventId);
                }
                case "BADGE_AWARDED" -> handleBadgeAwarded(message, eventId);
                case "POST_UPVOTED" -> handlePostUpvoted(message, eventId);
                case "CHAPTER_LIKE_RECEIVED" -> handleChapterLikeReceived(message, eventId);
                case "COMMENT_CREATED" -> handleCommentCreated(message, eventId);
                case "FORUM_THREAD_LIKE_RECEIVED" -> handleForumThreadLike(message, eventId);
                case "FORUM_POST_LIKE_RECEIVED" -> handleForumPostLike(message, eventId);
                case "REVIEW_LIKE_RECEIVED" -> handleReviewLike(message, eventId);
                default -> {
                    if (type == null) {
                        log.warn("XP event without 'type' field received keys={} raw={}", message.keySet(), message);
                    } else {
                        log.warn("Unknown XP event type '{}' keys={} raw={} -- ensure producer uses JSON and correct 'type' field.", type, message.keySet(), message);
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to process XP event: {}", message, e);
        }
    }

    private void handleLikeReceived(Map<String, Object> msg, String eventId) {
        Long receiverUserId = asLong(msg.get("receiverUserId"));
        Long commentId = asLong(msg.get("commentId"));
        if (receiverUserId == null) return;
        UserXp updated = levelServiceDomain.addXp(receiverUserId, likeReceivedXp, "LIKE_RECEIVED", String.valueOf(commentId), eventId);
        log.info("Applied LIKE_RECEIVED XP to user {} => total {}", receiverUserId, updated.getTotalXp());
        evaluateBadgesAsync(receiverUserId);
    }

    private void handleChapterRead(Map<String, Object> message, String eventId) {
        Long userId = asLong(message.get("userId"));
        if (userId == null) {
            log.warn("CHAPTER_READ event missing userId eventId={}", eventId);
            return;
        }
        Long chapterId = asLong(message.get("chapterId"));
        log.info("[XP-CONSUME] CHAPTER_READ received user={} chapter={} eventId={}", userId, chapterId, eventId);
        if (chapterId == null) {
            log.warn("CHAPTER_READ event missing chapterId user={} eventId={}", userId, eventId);
        }
        UserXp updated = levelServiceDomain.addXp(userId, chapterReadXp, "CHAPTER_READ", String.valueOf(chapterId), eventId);
        log.info("Applied CHAPTER_READ XP to user {} => total {}", userId, updated.getTotalXp());
        evaluateBadgesAsync(userId);
    }

    private void handleBadgeAwarded(Map<String, Object> msg, String eventId) {
        Long userId = asLong(msg.get("userId"));
        String badgeCode = (String) msg.get("badgeCode");
        if (userId == null || badgeCode == null) return;
        UserXp updated = levelServiceDomain.addXp(userId, badgeAwardedXp, "BADGE_AWARDED", badgeCode, eventId);
        log.info("Applied BADGE_AWARDED XP to user {} => total {}", userId, updated.getTotalXp());
    }

    private void handlePostUpvoted(Map<String, Object> msg, String eventId) {
        Long authorUserId = asLong(msg.get("userId")); // payload uses userId for XP receiver
        Long postId = asLong(msg.get("postId"));
        if (authorUserId == null || postId == null) return;
        UserXp updated = levelServiceDomain.addXp(authorUserId, postUpvotedXp, "POST_UPVOTED", String.valueOf(postId), eventId);
        log.info("Applied POST_UPVOTED XP to user {} => total {}", authorUserId, updated.getTotalXp());
        evaluateBadgesAsync(authorUserId);
    }

    private void handleChapterLikeReceived(Map<String, Object> msg, String eventId) {
        Long authorUserId = asLong(msg.get("userId"));
        Long chapterId = asLong(msg.get("chapterId"));
        if (authorUserId == null || chapterId == null) return;
        // If chapter authorship not yet modelled, these events may not be emitted; safe to process when they appear.
        UserXp updated = levelServiceDomain.addXp(authorUserId, chapterLikeReceivedXp, "CHAPTER_LIKE_RECEIVED", String.valueOf(chapterId), eventId);
        log.info("Applied CHAPTER_LIKE_RECEIVED XP to user {} => total {}", authorUserId, updated.getTotalXp());
        evaluateBadgesAsync(authorUserId);
    }

    private void handleCommentCreated(Map<String, Object> msg, String eventId) {
        Long authorUserId = asLong(msg.get("userId"));
        Long commentId = asLong(msg.get("commentId"));
        if (authorUserId == null || commentId == null) return;
        // Business rule: do NOT award XP for creating a comment (anti-abuse). We still persist a zero-XP transaction so that
        // badge logic (FIRST_COMMENT / TEN_COMMENTS) can continue to function without redesign.
        long awarded = 0L; // force zero regardless of configured property
        UserXp updated = levelServiceDomain.addXp(authorUserId, awarded, "COMMENT_CREATED", String.valueOf(commentId), eventId);
        log.info("Recorded COMMENT_CREATED with {} XP (comment XP disabled) for user {} => total {}", awarded, authorUserId, updated.getTotalXp());
        evaluateBadgesAsync(authorUserId);
    }

    private void handleForumThreadLike(Map<String, Object> msg, String eventId) {
        Long receiverUserId = asLong(msg.get("receiverUserId"));
        Long threadId = asLong(msg.get("threadId"));
        if (receiverUserId == null || threadId == null) return;
        UserXp updated = levelServiceDomain.addXp(receiverUserId, forumThreadLikeReceivedXp, "FORUM_THREAD_LIKE_RECEIVED", String.valueOf(threadId), eventId);
        log.info("Applied FORUM_THREAD_LIKE_RECEIVED XP to user {} => total {}", receiverUserId, updated.getTotalXp());
        evaluateBadgesAsync(receiverUserId);
    }

    private void handleForumPostLike(Map<String, Object> msg, String eventId) {
        Long receiverUserId = asLong(msg.get("receiverUserId"));
        Long postId = asLong(msg.get("postId"));
        if (receiverUserId == null || postId == null) return;
        UserXp updated = levelServiceDomain.addXp(receiverUserId, forumPostLikeReceivedXp, "FORUM_POST_LIKE_RECEIVED", String.valueOf(postId), eventId);
        log.info("Applied FORUM_POST_LIKE_RECEIVED XP to user {} => total {}", receiverUserId, updated.getTotalXp());
        evaluateBadgesAsync(receiverUserId);
    }

    private void handleReviewLike(Map<String, Object> msg, String eventId) {
        Long receiverUserId = asLong(msg.get("userId")); // review author in producer payload
        Long reviewId = asLong(msg.get("reviewId"));
        if (receiverUserId == null || reviewId == null) return;
        UserXp updated = levelServiceDomain.addXp(receiverUserId, reviewLikeReceivedXp, "REVIEW_LIKE_RECEIVED", String.valueOf(reviewId), eventId);
        log.info("Applied REVIEW_LIKE_RECEIVED XP to user {} => total {}", receiverUserId, updated.getTotalXp());
        evaluateBadgesAsync(receiverUserId);
    }

    private void evaluateBadgesAsync(Long userId) {
        try {
            var newly = badgeEvaluationService.evaluateUser(userId);
            if (!newly.isEmpty()) {
                log.info("User {} awarded badges {}", userId, newly.stream().map(UserBadge::getBadgeCode).toList());
                // Publishing BADGE_AWARDED events can be added here if needed using RabbitTemplate (not yet injected)
            }
        } catch (Exception ex) {
            log.error("Badge evaluation failed for user {}: {}", userId, ex.getMessage());
        }
    }

    private Long asLong(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.longValue();
        try { return Long.parseLong(o.toString()); } catch (NumberFormatException e) { return null; }
    }
}
