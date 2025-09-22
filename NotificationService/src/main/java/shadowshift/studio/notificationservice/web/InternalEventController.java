package shadowshift.studio.notificationservice.web;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.notificationservice.domain.NotificationType;
import shadowshift.studio.notificationservice.service.NotificationServiceFacade;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/internal/events")
@RequiredArgsConstructor
public class InternalEventController {

    private final NotificationServiceFacade facade;

    @PostMapping("/comment-created")
    public ResponseEntity<Void> commentCreated(@RequestBody CommentCreatedEvent body) {
        String payload = toJson(Map.of(
                "commentId", body.getCommentId(),
                "mangaId", body.getMangaId(),
                "chapterId", body.getChapterId(),
                "replyToCommentId", body.getReplyToCommentId(),
                "excerpt", truncate(body.getContent(), 120)
        ));
    // Mapping assumption: direct comment creation for user's content -> PROFILE_COMMENT (placeholder until refined types added)
    facade.createBasic(body.getTargetUserId(), NotificationType.PROFILE_COMMENT, payload, null);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/forum-post-created")
    public ResponseEntity<Void> forumPostCreated(@RequestBody ForumPostCreatedEvent body) {
        String payload = toJson(Map.of(
                "postId", body.getPostId(),
                "threadId", body.getThreadId(),
                "title", body.getTitle(),
                "excerpt", truncate(body.getContent(), 140)
        ));
    // Mapping assumption: new forum post in a thread the user follows -> REPLY_IN_FORUM_THREAD (placeholder)
    facade.createBasic(body.getTargetUserId(), NotificationType.REPLY_IN_FORUM_THREAD, payload, null);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/chapter-published")
    public ResponseEntity<Void> chapterPublished(@RequestBody ChapterPublishedEvent body) {
        // Dedupe key groups by user + manga to aggregate consecutive new chapters (simple strategy)
        String dedupeKey = "chapter_published:" + body.getTargetUserId() + ":" + body.getMangaId();
        String payload = toJson(Map.of(
                "mangaId", body.getMangaId(),
                "chapterId", body.getChapterId(),
                "chapterNumber", body.getChapterNumber(),
                "mangaTitle", body.getMangaTitle()
        ));
        facade.createBasic(body.getTargetUserId(), NotificationType.BOOKMARK_NEW_CHAPTER, payload, dedupeKey);
        return ResponseEntity.accepted().build();
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
        if (s.length() <= max) return s;
        return s.substring(0, max - 3) + "...";
    }

    private String toJson(Map<String, Object> map) {
        StringBuilder sb = new StringBuilder();
        sb.append('{');
        boolean first = true;
        for (var e : map.entrySet()) {
            if (!first) sb.append(',');
            first = false;
            sb.append('"').append(escape(e.getKey())).append('"').append(':');
            Object v = e.getValue();
            if (v == null) {
                sb.append("null");
            } else if (v instanceof Number || v instanceof Boolean) {
                sb.append(v.toString());
            } else {
                sb.append('"').append(escape(String.valueOf(v))).append('"');
            }
        }
        sb.append('}');
        return sb.toString();
    }

    private String escape(String s) { return s.replace("\\", "\\\\").replace("\"", "\\\""); }

    @Data
    public static class CommentCreatedEvent {
        private Long targetUserId; // user who should receive notification
        private Long commentId;
        private Long mangaId;
        private Long chapterId;
        private Long replyToCommentId;
        private String content;
    }

    @Data
    public static class ForumPostCreatedEvent {
        private Long targetUserId;
        private Long postId;
        private Long threadId;
        private String title;
        private String content;
    }

    @Data
    public static class ChapterPublishedEvent {
        private Long targetUserId;
        private Long mangaId;
        private Long chapterId;
        private String chapterNumber;
        private String mangaTitle;
    }
}
