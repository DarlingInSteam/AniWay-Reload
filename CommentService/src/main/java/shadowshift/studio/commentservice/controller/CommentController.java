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
import java.util.Map;


/**
 * REST контроллер для управления комментариями.
 * Предоставляет API endpoints для создания, чтения, обновления и удаления комментариев,
 * а также для работы с реакциями и получения статистики.
 *
 * @author ShadowShiftStudio
 */
@RestController
@RequestMapping("/api/comments")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class CommentController {

    private final CommentService commentService;

    /**
     * Создать новый комментарий.
     *
     * @param createDTO DTO с данными для создания комментария
     * @return ResponseEntity с созданным комментарием и статусом 201 CREATED
     * @throws RuntimeException если пользователь не аутентифицирован
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
     * Обновить существующий комментарий.
     *
     * @param commentId идентификатор комментария для обновления
     * @param updateDTO DTO с новыми данными комментария
     * @return ResponseEntity с обновленным комментарием и статусом 200 OK
     * @throws RuntimeException если пользователь не имеет прав на обновление или не аутентифицирован
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
     * Удалить комментарий.
     *
     * @param commentId идентификатор комментария для удаления
     * @return ResponseEntity с пустым телом и статусом 204 NO CONTENT
     * @throws RuntimeException если пользователь не имеет прав на удаление или не аутентифицирован
     */
    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long commentId) {
        try {
            Long userId = getCurrentUserId();
            log.info("Deleting comment {} by user {}", commentId, userId);
            boolean isAdmin = currentUserIsAdmin();
            commentService.deleteComment(commentId, userId, isAdmin);
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
     * Получить список комментариев для указанного объекта с пагинацией и сортировкой.
     *
     * @param targetId идентификатор целевого объекта (манга, глава и т.д.)
     * @param type тип комментария
     * @param page номер страницы (начиная с 0)
     * @param size размер страницы
     * @param sortBy поле для сортировки
     * @param sortDir направление сортировки (asc/desc)
     * @return ResponseEntity со списком комментариев и статусом 200 OK
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
     * Получить ответы на указанный комментарий с пагинацией и сортировкой.
     *
     * @param parentCommentId идентификатор родительского комментария
     * @param page номер страницы (начиная с 0)
     * @param size размер страницы
     * @param sortBy поле для сортировки
     * @param sortDir направление сортировки (asc/desc)
     * @return ResponseEntity со списком ответов и статусом 200 OK
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
     * Добавить реакцию на комментарий.
     *
     * @param commentId идентификатор комментария
     * @param reactionType тип реакции
     * @return ResponseEntity с пустым телом и статусом 200 OK
     * @throws RuntimeException если пользователь не аутентифицирован
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
     * Получить статистику реакций для комментария.
     *
     * @param commentId идентификатор комментария
     * @return ResponseEntity со статистикой реакций и статусом 200 OK
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
     * Получить количество комментариев для указанного объекта.
     *
     * @param targetId идентификатор целевого объекта
     * @param type тип комментария
     * @return ResponseEntity с количеством комментариев и статусом 200 OK
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

    @GetMapping("/count/batch")
    public ResponseEntity<CommentCountBatchResponseDTO> getCommentsCountBatch(
            @RequestParam CommentType type,
            @RequestParam("ids") List<Long> targetIds) {
        try {
            Map<Long, Long> counts = commentService.getCommentsCountBatch(targetIds, type);
            CommentCountBatchResponseDTO response = CommentCountBatchResponseDTO.builder()
                    .counts(counts)
                    .build();
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting batch comment counts for ids {} and type {}", targetIds, type, e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Получить все комментарии пользователя для отображения в профиле.
     *
     * @param userId идентификатор пользователя
     * @return ResponseEntity со списком комментариев пользователя и статусом 200 OK
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<CommentResponseDTO>> getUserComments(@PathVariable Long userId) {
        try {
            log.info("Getting comments for user {}", userId);

            List<CommentResponseDTO> comments = commentService.getAllUserComments(userId);
            return ResponseEntity.ok(comments);
        } catch (Exception e) {
            log.error("Error getting comments for user {}", userId, e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Получить идентификатор текущего аутентифицированного пользователя.
     *
     * @return идентификатор пользователя
     * @throws RuntimeException если пользователь не аутентифицирован
     */
    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getDetails() instanceof UserPrincipal) {
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getDetails();
            return userPrincipal.getUserId();
        }
        throw new RuntimeException("User not authenticated");
    }

    private boolean currentUserIsAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }
        Object details = authentication.getDetails();
        if (details instanceof UserPrincipal userPrincipal) {
            String role = userPrincipal.getRole();
            if (role != null && role.equalsIgnoreCase("ADMIN")) {
                return true;
            }
        }
        return authentication.getAuthorities() != null && authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equalsIgnoreCase(a.getAuthority()));
    }

    /**
     * Обработчик исключений типа RuntimeException.
     * Возвращает структурированный ответ об ошибке.
     *
     * @param e исключение RuntimeException
     * @return ResponseEntity с информацией об ошибке и статусом 400 BAD REQUEST
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

    /**
     * Обработчик общих исключений.
     * Возвращает структурированный ответ об ошибке.
     *
     * @param e общее исключение
     * @return ResponseEntity с информацией об ошибке и статусом 500 INTERNAL SERVER ERROR
     */
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
