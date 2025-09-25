package shadowshift.studio.commentservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import shadowshift.studio.commentservice.entity.Comment;
import shadowshift.studio.commentservice.repository.CommentRepository;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/comments/tops")
@RequiredArgsConstructor
public class CommentTopsController {

    private final CommentRepository commentRepository;

    @GetMapping
    public ResponseEntity<List<Comment>> topComments(
            @RequestParam(defaultValue = "all") String range,
            @RequestParam(defaultValue = "10") int limit
    ) {
        int capped = Math.min(Math.max(limit,1),100);
        var pr = PageRequest.of(0, capped);
        List<Comment> data;
        if ("all".equals(range)) {
            data = commentRepository.findTopCommentsAllTime(pr).getContent();
        } else {
            int days = switch(range) { case "7" -> 7; case "30" -> 30; default -> 7; };
            data = commentRepository.findTopCommentsSince(LocalDateTime.now().minusDays(days), pr).getContent();
        }
        return ResponseEntity.ok(data);
    }
}
