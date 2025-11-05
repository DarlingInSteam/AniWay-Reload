package shadowshift.studio.commentservice.controller;

import java.util.List;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import shadowshift.studio.commentservice.dto.CommentAggregateDTO;
import shadowshift.studio.commentservice.dto.CommentAggregateRequest;
import shadowshift.studio.commentservice.enums.CommentType;
import shadowshift.studio.commentservice.service.CommentService;

@RestController
@RequestMapping("/internal/comments")
@RequiredArgsConstructor
@Slf4j
public class InternalCommentMetricsController {

    private final CommentService commentService;

    @PostMapping("/aggregate")
    public ResponseEntity<?> aggregateComments(@RequestBody CommentAggregateRequest request) {
        if (request == null || request.targetIds() == null || request.commentType() == null) {
            return ResponseEntity.badRequest().body("commentType and targetIds are required");
        }

        CommentType type;
        try {
            type = CommentType.valueOf(request.commentType().trim().toUpperCase());
        } catch (Exception ex) {
            log.warn("Invalid commentType supplied: {}", request.commentType());
            return ResponseEntity.badRequest().body("Invalid commentType value");
        }

        List<CommentAggregateDTO> aggregates = commentService.getCommentAggregates(type, request.targetIds());
        return ResponseEntity.ok(aggregates);
    }
}
