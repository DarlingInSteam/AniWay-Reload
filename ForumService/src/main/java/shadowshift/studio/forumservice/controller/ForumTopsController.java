package shadowshift.studio.forumservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import shadowshift.studio.forumservice.entity.ForumThread;
import shadowshift.studio.forumservice.entity.ForumPost;
import shadowshift.studio.forumservice.dto.tops.ForumThreadTopDTO;
import shadowshift.studio.forumservice.dto.tops.ForumPostTopDTO;
import shadowshift.studio.forumservice.repository.ForumThreadRepository;
import shadowshift.studio.forumservice.repository.ForumPostRepository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Публичные рейтинги форума: темы и посты.
 * NOTE: DTO не создаём пока – возвращаем сущности (поля безопасны). При необходимости можно добавить облегчённые DTO.
 */
@RestController
@RequestMapping("/api/forum/tops")
@RequiredArgsConstructor
public class ForumTopsController {

    private final ForumThreadRepository threadRepository;
    private final ForumPostRepository postRepository;

    @GetMapping("/threads")
    public ResponseEntity<List<ForumThreadTopDTO>> topThreads(
            @RequestParam(defaultValue = "all") String range,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "replies") String sort
    ) {
        int capped = Math.min(Math.max(limit,1),100);
        PageRequest pr = PageRequest.of(0, capped);
        List<ForumThread> data;
        if ("all".equals(range)) {
            data = threadRepository.findTopThreadsAllTime(pr).getContent();
        } else {
            int days = switch(range) { case "7" -> 7; case "30" -> 30; default -> 7; };
            data = threadRepository.findTopThreadsSince(LocalDateTime.now().minusDays(days), pr).getContent();
        }
        List<ForumThreadTopDTO> dtos = data.stream().map(t -> ForumThreadTopDTO.builder()
                .id(t.getId())
                .title(t.getTitle())
                .contentExcerpt(trim(t.getContent()))
                .authorId(t.getAuthorId())
                .repliesCount(t.getRepliesCount())
                .likesCount(t.getLikesCount())
                .viewsCount(t.getViewsCount())
                .likeCount(t.getLikesCount())
                .createdAt(t.getCreatedAt())
                .build()).toList();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/posts")
    public ResponseEntity<List<ForumPostTopDTO>> topPosts(
            @RequestParam(defaultValue = "all") String range,
            @RequestParam(defaultValue = "10") int limit
    ) {
        int capped = Math.min(Math.max(limit,1),100);
        PageRequest pr = PageRequest.of(0, capped);
        List<ForumPost> data;
        if ("all".equals(range)) {
            data = postRepository.findTopPostsAllTime(pr).getContent();
        } else {
            int days = switch(range) { case "7" -> 7; case "30" -> 30; default -> 7; };
            data = postRepository.findTopPostsSince(LocalDateTime.now().minusDays(days), pr).getContent();
        }
        List<ForumPostTopDTO> dtos = data.stream().map(p -> ForumPostTopDTO.builder()
                .id(p.getId())
                .threadId(p.getThreadId())
                .contentExcerpt(trim(p.getContent()))
                .authorId(p.getAuthorId())
                .likesCount(p.getLikesCount())
                .dislikesCount(p.getDislikesCount())
                .likeCount(p.getLikesCount())
                .dislikeCount(p.getDislikesCount())
                .trustFactor((p.getLikesCount()==null?0:p.getLikesCount()) - (p.getDislikesCount()==null?0:p.getDislikesCount()))
                .createdAt(p.getCreatedAt())
                .build()).toList();
        return ResponseEntity.ok(dtos);
    }

    private String trim(String content) {
        if (content == null) return null;
        String plain = content.replaceAll("\n", " ").trim();
        return plain.length() > 180 ? plain.substring(0,177) + "..." : plain;
    }
}
