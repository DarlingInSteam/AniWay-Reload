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
    public ResponseEntity<List<ForumThread>> topThreads(
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
        return ResponseEntity.ok(data);
    }

    @GetMapping("/posts")
    public ResponseEntity<List<ForumPost>> topPosts(
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
        return ResponseEntity.ok(data);
    }
}
