package shadowshift.studio.commentservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.commentservice.dto.*;
import shadowshift.studio.commentservice.enums.CommentType;
import shadowshift.studio.commentservice.enums.ReactionType;
import shadowshift.studio.commentservice.security.UserPrincipal;
import shadowshift.studio.commentservice.service.CommentService;

import jakarta.validation.Valid;
import java.util.List;

/**
 * Контроллер для работы с комментариями
 */
@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class CommentController {

    private final CommentService commentService;

    /**
     * Создание нового комментария
     */
    @PostMapping
    public ResponseEntity<CommentResponseDTO> createComment(@Valid @RequestBody CommentCreateDTO createDTO) {
        try {
            Long userId = getCurrentUserId();
            log.info("Creating comment for target {} by user {}", createDTO.getTargetId(), userId);
            
            CommentResponseDTO response = commentService.createComment(createDTO, userId);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            log.error("Error creating comment", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Обновление комментария
     */
    @PutMapping("/{commentId}")
    public ResponseEntity<CommentResponseDTO> updateComment(
            @PathVariable Long commentId,
            @Valid @RequestBody CommentUpdateDTO updateDTO) {
        try {
            Long userId = getCurrentUserId();
            log.info("Updating comment {} by user {}", commentId, userId);
            
            CommentResponseDTO response = commentService.updateComment(commentId, updateDTO, userId);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            log.error("Error updating comment {}: {}", commentId, e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error updating comment {}", commentId, e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Удаление комментария
     */
    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long commentId) {
        try {
            Long userId = getCurrentUserId();
            log.info("Deleting comment {} by user {}", commentId, userId);
            
            commentService.deleteComment(commentId, userId);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            log.error("Error deleting comment {}: {}", commentId, e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error deleting comment {}", commentId, e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Получение комментариев для определенного объекта
     */
    @GetMapping
    public ResponseEntity<List<CommentResponseDTO>> getComments(
            @RequestParam Long targetId,
            @RequestParam CommentType type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        try {
            log.info("Getting comments for target {} with type {}", targetId, type);
            
            Sort sort = Sort.by(sortDir.equalsIgnoreCase("desc") ? 
                    Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
            Pageable pageable = PageRequest.of(page, size, sort);
            
            List<CommentResponseDTO> comments = commentService.getCommentsByTarget(targetId, type, pageable);
            return ResponseEntity.ok(comments);
        } catch (Exception e) {
            log.error("Error getting comments for target {} with type {}", targetId, type, e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Получение ответов на комментарий
     */
    @GetMapping("/{parentCommentId}/replies")
    public ResponseEntity<List<CommentResponseDTO>> getReplies(
            @PathVariable Long parentCommentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir) {
        try {
            log.info("Getting replies for comment {}", parentCommentId);
            
            Sort sort = Sort.by(sortDir.equalsIgnoreCase("desc") ? 
                    Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
            Pageable pageable = PageRequest.of(page, size, sort);
            
            List<CommentResponseDTO> replies = commentService.getReplies(parentCommentId, pageable);
            return ResponseEntity.ok(replies);
        } catch (Exception e) {
            log.error("Error getting replies for comment {}", parentCommentId, e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Добавление реакции на комментарий
     */
    @PostMapping("/{commentId}/reactions")
    public ResponseEntity<Void> addReaction(
            @PathVariable Long commentId,
            @RequestParam ReactionType reactionType) {
        try {
            Long userId = getCurrentUserId();
            log.info("Adding reaction {} to comment {} by user {}", reactionType, commentId, userId);
            
            commentService.addReaction(commentId, reactionType, userId);
            return ResponseEntity.ok().build();
        } catch (RuntimeException e) {
            log.error("Error adding reaction to comment {}: {}", commentId, e.getMessage());
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            log.error("Error adding reaction to comment {}", commentId, e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Получение статистики реакций для комментария
     */
    @GetMapping("/{commentId}/reactions")
    public ResponseEntity<CommentReactionDTO> getReactionStats(@PathVariable Long commentId) {
        try {
            log.info("Getting reaction stats for comment {}", commentId);
            
            CommentReactionDTO stats = commentService.getReactionStats(commentId);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Error getting reaction stats for comment {}", commentId, e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Получение количества комментариев для определенного объекта
     */
    @GetMapping("/count")
    public ResponseEntity<CommentCountResponseDTO> getCommentsCount(
            @RequestParam Long targetId,
            @RequestParam CommentType type) {
        try {
            log.info("Getting comments count for target {} with type {}", targetId, type);
            
            long count = commentService.getCommentsCount(targetId, type);
            CommentCountResponseDTO response = CommentCountResponseDTO.builder()
                    .count(count)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting comments count for target {} with type {}", targetId, type, e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Получение всех комментариев пользователя для профиля
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<CommentResponseDTO>> getUserComments(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        try {
            log.info("Getting comments for user {}", userId);
            
            Sort sort = Sort.by(sortDir.equalsIgnoreCase("desc") ? 
                    Sort.Direction.DESC : Sort.Direction.ASC, sortBy);
            Pageable pageable = PageRequest.of(page, size, sort);
            
            List<CommentResponseDTO> comments = commentService.getAllUserComments(userId, pageable);
            return ResponseEntity.ok(comments);
        } catch (Exception e) {
            log.error("Error getting comments for user {}", userId, e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Получение ID текущего пользователя из контекста безопасности
     */
    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getDetails() instanceof UserPrincipal) {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getDetails();
            return userPrincipal.getUserId();
        }
        throw new RuntimeException("User not authenticated");
    }

    /**
     * Обработка ошибок
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ErrorResponseDTO> handleRuntimeException(RuntimeException e) {
        log.error("Runtime exception: {}", e.getMessage());
        ErrorResponseDTO error = ErrorResponseDTO.builder()
                .message(e.getMessage())
                .status(HttpStatus.BAD_REQUEST.value())
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDTO> handleException(Exception e) {
        log.error("Unexpected error", e);
        ErrorResponseDTO error = ErrorResponseDTO.builder()
                .message("Internal server error")
                .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}
