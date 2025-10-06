package shadowshift.studio.commentservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.commentservice.dto.*;
import shadowshift.studio.commentservice.entity.Comment;
import shadowshift.studio.commentservice.entity.CommentReaction;
import shadowshift.studio.commentservice.enums.CommentType;
import shadowshift.studio.commentservice.enums.ReactionType;
import shadowshift.studio.commentservice.repository.CommentRepository;
import shadowshift.studio.commentservice.repository.CommentReactionRepository;
import shadowshift.studio.commentservice.notification.NotificationEventPublisher;
import shadowshift.studio.commentservice.review.ReviewAuthorClient;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.stream.Collectors;

/**
 * Сервис для управления комментариями и реакциями.
 * Предоставляет бизнес-логику для создания, обновления, удаления комментариев,
 * управления древовидной структурой комментариев, обработки реакций пользователей
 * и получения статистики комментариев.
 *
 * @author ShadowShiftStudio
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CommentService {

    private final CommentRepository commentRepository;
    private final CommentReactionRepository commentReactionRepository;
    private final RabbitTemplate rabbitTemplate;

    @Value("${xp.events.exchange:xp.events.exchange}")
    private String xpExchange;

    @Value("${xp.events.likeRoutingKey:xp.events.like}")
    private String likeRoutingKey;
    
    @Value("${xp.events.commentCreatedRoutingKey:xp.events.comment-created}")
    private String commentCreatedRoutingKey;
    private final AuthService authService;
    private final NotificationEventPublisher notificationEventPublisher;
    private final ReviewAuthorClient reviewAuthorClient;
    
    // Base URL for auth-service (supports environment override via AUTH_SERVICE_URL). Needed for internal metrics increment.
    @Value("${AUTH_SERVICE_URL:http://auth-service:8085}")
    private String authServiceBaseUrl;

    private static final int EDIT_TIME_LIMIT_DAYS = 7;

    /**
     * Создает новый комментарий для указанного объекта.
     * Выполняет валидацию входных данных, проверяет существование родительского комментария
     * и обеспечивает корректность древовидной структуры комментариев.
     *
     * @param createDTO DTO с данными для создания комментария
     * @param userId идентификатор пользователя, создающего комментарий
     * @return CommentResponseDTO созданного комментария
     * @throws RuntimeException если родительский комментарий не найден или принадлежит другому объекту
     */
    @Transactional
    public CommentResponseDTO createComment(CommentCreateDTO createDTO, Long userId) {
        log.info("Creating comment for target {} with type {} by user {}",
                createDTO.getTargetId(), createDTO.getType(), userId);

        if (createDTO.getParentCommentId() != null) {
            Comment parentComment = commentRepository.findById(createDTO.getParentCommentId())
                .orElseThrow(() -> new RuntimeException("Parent comment not found"));

            if (!parentComment.getTargetId().equals(createDTO.getTargetId()) ||
                parentComment.getType() != createDTO.getType()) {
                throw new RuntimeException("Parent comment belongs to different target");
            }
        }

        Comment comment = Comment.builder()
                .content(createDTO.getContent())
                .userId(userId)
                .targetId(createDTO.getTargetId())
                .commentType(createDTO.getType())
                .createdAt(LocalDateTime.now(ZoneOffset.UTC))
                .updatedAt(LocalDateTime.now(ZoneOffset.UTC))
                .isDeleted(false)
                .build();

        if (createDTO.getParentCommentId() != null) {
            Comment parentComment = commentRepository.findById(createDTO.getParentCommentId())
                    .orElseThrow(() -> new RuntimeException("Parent comment not found"));
            comment.setParentComment(parentComment);
        }

    Comment savedComment = commentRepository.save(comment);

        // Fire-and-forget increment of user comment counter in AuthService
        try {
            var rt = new org.springframework.web.client.RestTemplate();
            String url = authServiceBaseUrl.replaceAll("/+$", "") + "/internal/metrics/users/" + userId + "/comments/increment";
            rt.postForEntity(url, null, Void.class);
            log.debug("Invoked AuthService commentsCount increment endpoint: {}", url);
        } catch (Exception ex) {
            // Use WARN so misconfiguration (e.g., wrong host/port) is visible in default logs
            log.warn("Failed to call AuthService incrementCommentsCount for user {}: {}", userId, ex.getMessage());
        }

        // Publish COMMENT_CREATED event (0 XP tracking) immediately after persistence
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("type", "COMMENT_CREATED");
            event.put("eventId", "COMMENT_CREATED:" + savedComment.getId()); // deterministic per comment
            event.put("userId", userId); // author receives badge tracking
            event.put("commentId", savedComment.getId());
            event.put("targetId", savedComment.getTargetId());
            event.put("commentType", savedComment.getType().name());
            event.put("occurredAt", Instant.now().toString());
            rabbitTemplate.convertAndSend(xpExchange, commentCreatedRoutingKey, event);
            log.info("Published COMMENT_CREATED event for comment {} by user {}", savedComment.getId(), userId);
        } catch (Exception ex) {
            log.error("Failed to publish COMMENT_CREATED event: {}", ex.getMessage());
        }

        try {
            Long targetUserId = null;
            Long mangaId = null;
            Long chapterId = null;
            Long replyToCommentId = savedComment.getParentCommentId();

            // Derive context ids based on type
            if (savedComment.getType() == CommentType.MANGA) {
                mangaId = savedComment.getTargetId();
            } else if (savedComment.getType() == CommentType.CHAPTER) {
                chapterId = savedComment.getTargetId();
            }

            // Determine target user to notify
            if (replyToCommentId != null) {
                // Notify parent comment author (if not self)
                Comment parent = commentRepository.findById(replyToCommentId).orElse(null);
                if (parent != null && !parent.getUserId().equals(userId)) {
                    targetUserId = parent.getUserId();
                }
            } else if (savedComment.getType() == CommentType.PROFILE) {
                // PROFILE comment: targetId assumed to be profile owner's userId
                if (!savedComment.getTargetId().equals(userId)) {
                    targetUserId = savedComment.getTargetId();
                }
            } else if (savedComment.getType() == CommentType.REVIEW) {
                // comment on review (root only) -> notify review author
                log.debug("Review comment detected: target(reviewId)={}, commentId={}", savedComment.getTargetId(), savedComment.getId());
                Long reviewAuthor = reviewAuthorClient.findReviewAuthorId(savedComment.getTargetId());
                log.debug("Resolved reviewAuthor={} for reviewId={}", reviewAuthor, savedComment.getTargetId());
                if (reviewAuthor != null && !reviewAuthor.equals(userId)) {
                    targetUserId = reviewAuthor;
                    log.debug("Publishing comment-on-review notification: targetUserId={}, commentId={}", targetUserId, savedComment.getId());
                    notificationEventPublisher.publishCommentOnReview(
                            targetUserId,
                            savedComment.getTargetId(), // reviewId
                            savedComment.getId(),
                            mangaId,
                            savedComment.getContent()
                    );
                }
            }

            if (targetUserId != null) {
                // For review root comments we already emitted specialized event above.
                if (savedComment.getType() != CommentType.REVIEW || replyToCommentId != null) {
                    notificationEventPublisher.publishCommentCreated(
                            targetUserId,
                            savedComment.getId(),
                            mangaId,
                            chapterId,
                            replyToCommentId,
                            savedComment.getContent(),
                            savedComment.getType().name()
                    );
                }
            }
        } catch (Exception e) {
            log.warn("Failed to emit comment-created notification event: {}", e.getMessage());
        }

        return mapToResponseDTO(savedComment);
    }

    /**
     * Обновляет содержимое существующего комментария.
     * Проверяет права пользователя на редактирование, временные ограничения
     * и статус комментария перед выполнением обновления.
     *
     * @param commentId идентификатор обновляемого комментария
     * @param updateDTO DTO с новыми данными комментария
     * @param userId идентификатор пользователя, выполняющего обновление
     * @return CommentResponseDTO обновленного комментария
     * @throws RuntimeException если комментарий не найден, пользователь не имеет прав,
     *                         истек срок редактирования или комментарий удален
     */
    @Transactional
    public CommentResponseDTO updateComment(Long commentId, CommentUpdateDTO updateDTO, Long userId) {
        log.info("Updating comment {} by user {}", commentId, userId);

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getUserId().equals(userId)) {
            throw new RuntimeException("You can only edit your own comments");
        }

        if (comment.getCreatedAt().isBefore(LocalDateTime.now(ZoneOffset.UTC).minusDays(EDIT_TIME_LIMIT_DAYS))) {
            throw new RuntimeException("Comment editing time limit exceeded");
        }

        if (comment.getIsDeleted()) {
            throw new RuntimeException("Cannot edit deleted comment");
        }

        comment.setContent(updateDTO.getContent());
        comment.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
        comment.setIsEdited(true);

        Comment savedComment = commentRepository.save(comment);
        log.info("Comment {} updated successfully", commentId);

        return mapToResponseDTO(savedComment);
    }

    /**
     * Выполняет мягкое удаление комментария и всех его дочерних комментариев.
     * Проверяет права пользователя на удаление и рекурсивно удаляет
     * всю ветвь комментариев в древовидной структуре.
     *
     * @param commentId идентификатор удаляемого комментария
     * @param userId идентификатор пользователя, выполняющего удаление
     * @throws RuntimeException если комментарий не найден или пользователь не имеет прав
     */
    @Transactional
    public void deleteComment(Long commentId, Long userId, boolean adminOverride) {
        log.info("Deleting comment {} by user {} (adminOverride={})", commentId, userId, adminOverride);

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!adminOverride && !comment.getUserId().equals(userId)) {
            throw new RuntimeException("You can only delete your own comments");
        }

        comment.setIsDeleted(true);
        comment.setDeletedAt(LocalDateTime.now(ZoneOffset.UTC));
        comment.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));

        commentRepository.save(comment);

        deleteChildComments(commentId);

        log.info("Comment {} and its children deleted successfully", commentId);
    }

    /**
     * Рекурсивно удаляет все дочерние комментарии указанного комментария.
     * Используется для поддержания целостности древовидной структуры при удалении.
     *
     * @param parentCommentId идентификатор родительского комментария
     */
    private void deleteChildComments(Long parentCommentId) {
        List<Comment> children = commentRepository.findByParentCommentIdAndIsDeleted(parentCommentId, false);
        for (Comment child : children) {
            child.setIsDeleted(true);
            child.setDeletedAt(LocalDateTime.now(ZoneOffset.UTC));
            child.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
            commentRepository.save(child);

            deleteChildComments(child.getId());
        }
    }

    /**
     * Получает список корневых комментариев для указанного объекта с пагинацией.
     * Возвращает только комментарии верхнего уровня с полной информацией
     * о дочерних комментариях для каждого корневого комментария.
     *
     * @param targetId идентификатор целевого объекта
     * @param type тип комментария
     * @param pageable параметры пагинации и сортировки
     * @return список комментариев с дочерними комментариями
     */
    public List<CommentResponseDTO> getCommentsByTarget(Long targetId, CommentType type, Pageable pageable) {
        log.info("Getting comments for target {} with type {}", targetId, type);

        Page<Comment> comments = commentRepository.findByTargetIdAndCommentTypeAndParentCommentIsNullAndIsDeleted(
                targetId, type, false, pageable);

        return comments.getContent().stream()
                .map(this::mapToResponseDTOWithChildren)
                .collect(Collectors.toList());
    }

    /**
     * Получает список ответов на указанный комментарий с пагинацией.
     * Возвращает прямые ответы на комментарий с полной информацией
     * о их дочерних комментариях.
     *
     * @param parentCommentId идентификатор родительского комментария
     * @param pageable параметры пагинации и сортировки
     * @return список ответов на комментарий
     */
    public List<CommentResponseDTO> getReplies(Long parentCommentId, Pageable pageable) {
        log.info("Getting replies for comment {}", parentCommentId);

        Page<Comment> replies = commentRepository.findByParentCommentIdAndIsDeleted(
                parentCommentId, false, pageable);

        return replies.getContent().stream()
                .map(this::mapToResponseDTOWithChildren)
                .collect(Collectors.toList());
    }

    /**
     * Получает общее количество комментариев для указанного объекта.
     * Подсчитывает все комментарии (включая ответы) для объекта определенного типа.
     *
     * @param targetId идентификатор целевого объекта
     * @param type тип комментария
     * @return количество комментариев
     */
    public long getCommentsCount(Long targetId, CommentType type) {
        log.info("Getting comments count for target {} with type {}", targetId, type);

        return commentRepository.countByTargetIdAndCommentTypeAndIsDeleted(targetId, type, false);
    }

    /**
     * Добавляет, изменяет или удаляет реакцию пользователя на комментарий.
     * Если реакция того же типа уже существует - удаляет ее.
     * Если реакция другого типа существует - изменяет тип.
     * Если реакции нет - создает новую.
     *
     * @param commentId идентификатор комментария
     * @param reactionType тип реакции (лайк/дизлайк)
     * @param userId идентификатор пользователя
     * @throws RuntimeException если комментарий не найден или удален
     */
    @Transactional
    public void addReaction(Long commentId, ReactionType reactionType, Long userId) {
        log.info("Adding reaction {} to comment {} by user {}", reactionType, commentId, userId);

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (comment.getIsDeleted()) {
            throw new RuntimeException("Cannot react to deleted comment");
        }

        Optional<CommentReaction> existingReaction =
                commentReactionRepository.findByCommentIdAndUserId(commentId, userId);

        boolean publishLike = false;
        Long receiverUserId = comment.getUserId();

        if (existingReaction.isPresent()) {
            CommentReaction reaction = existingReaction.get();
            if (reaction.getReactionType() == reactionType) {
                commentReactionRepository.delete(reaction);
                log.info("Removed existing reaction {} from comment {}", reactionType, commentId);
            } else {
                reaction.setReactionType(reactionType);
                commentReactionRepository.save(reaction);
                log.info("Changed reaction to {} for comment {}", reactionType, commentId);
                if (reactionType == ReactionType.LIKE) {
                    publishLike = true; // switched to LIKE
                }
            }
        } else {
            CommentReaction reaction = CommentReaction.builder()
                    .comment(comment)
                    .userId(userId)
                    .reactionType(reactionType)
                    .createdAt(LocalDateTime.now(ZoneOffset.UTC))
                    .build();

            commentReactionRepository.save(reaction);
            log.info("Added new reaction {} to comment {}", reactionType, commentId);
            if (reactionType == ReactionType.LIKE) {
                publishLike = true;
            }
        }

        if (publishLike && !Objects.equals(receiverUserId, userId)) {
            try {
                Map<String, Object> event = new HashMap<>();
                event.put("type", "LIKE_RECEIVED");
                event.put("eventId", UUID.randomUUID().toString());
                event.put("receiverUserId", receiverUserId);
                event.put("actorUserId", userId);
                event.put("commentId", commentId);
                event.put("sourceType", "COMMENT");
                event.put("reactionType", "LIKE");
                event.put("occurredAt", Instant.now().toString());
                rabbitTemplate.convertAndSend(xpExchange, likeRoutingKey, event);
                log.info("Published LIKE_RECEIVED XP event for comment {} to user {}", commentId, receiverUserId);
            } catch (Exception ex) {
                log.error("Failed to publish LIKE_RECEIVED event", ex);
            }
        }
    }

    /**
     * Получает статистику реакций для указанного комментария.
     * Подсчитывает количество лайков и дизлайков.
     *
     * @param commentId идентификатор комментария
     * @return CommentReactionDTO со статистикой реакций
     */
    public CommentReactionDTO getReactionStats(Long commentId) {
        long likesCount = commentReactionRepository.countByCommentIdAndReactionType(commentId, ReactionType.LIKE);
        long dislikesCount = commentReactionRepository.countByCommentIdAndReactionType(commentId, ReactionType.DISLIKE);

        return CommentReactionDTO.builder()
                .commentId(commentId)
                .likesCount(likesCount)
                .dislikesCount(dislikesCount)
                .build();
    }

    /**
     * Получает все корневые комментарии пользователя для отображения в профиле.
     * Возвращает комментарии без полной информации о дочерних комментариях
     * для оптимизации производительности.
     *
     * @param userId идентификатор пользователя
     * @return список комментариев пользователя
     */
    public List<CommentResponseDTO> getAllUserComments(Long userId) {
        log.info("Getting all comments for user {}", userId);

        List<Comment> userComments = commentRepository.findAllUserRootComments(userId);

        return userComments.stream()
                .map(this::mapToResponseDTOWithoutReplies)
                .collect(Collectors.toList());
    }

    /**
     * Преобразует сущность Comment в CommentResponseDTO с полной информацией о дочерних комментариях.
     * Рекурсивно строит древовидную структуру комментариев для отображения.
     *
     * @param comment сущность комментария для преобразования
     * @return CommentResponseDTO с дочерними комментариями
     */
    private CommentResponseDTO mapToResponseDTOWithChildren(Comment comment) {
        CommentResponseDTO dto = mapToResponseDTO(comment);

        List<Comment> children = commentRepository.findByParentCommentIdAndIsDeleted(comment.getId(), false);
        List<CommentResponseDTO> childrenDTOs = children.stream()
                .map(this::mapToResponseDTOWithChildren)
                .collect(Collectors.toList());

        dto.setReplies(childrenDTOs);
        dto.setRepliesCount(children.size());

        return dto;
    }

    /**
     * Преобразует сущность Comment в CommentResponseDTO с базовой информацией.
     * Получает данные пользователя через AuthService и статистику реакций.
     *
     * @param comment сущность комментария для преобразования
     * @return CommentResponseDTO с базовой информацией
     */
    private CommentResponseDTO mapToResponseDTO(Comment comment) {
        UserInfoDTO userInfo = authService.getUserInfo(comment.getUserId());

        CommentReactionDTO reactionStats = getReactionStats(comment.getId());

        // Определяем реакцию текущего пользователя (если аутентифицирован)
        CurrentUserContext userContext = resolveCurrentUserContext();
        Long currentUserId = userContext.userId();
        boolean isAdmin = userContext.isAdmin();

        ReactionType currentUserReaction = null;
        if (currentUserId != null) {
            try {
                currentUserReaction = commentReactionRepository.findByCommentIdAndUserId(comment.getId(), currentUserId)
                        .map(CommentReaction::getReactionType)
                        .orElse(null);
            } catch (Exception ex) {
                log.debug("Could not resolve current user reaction for comment {}: {}", comment.getId(), ex.getMessage());
            }
        }

        boolean isDeleted = Boolean.TRUE.equals(comment.getIsDeleted());
        boolean canEdit = !isDeleted && currentUserId != null && currentUserId.equals(comment.getUserId());
        boolean canDelete = !isDeleted && (canEdit || isAdmin);

        return CommentResponseDTO.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .userId(comment.getUserId())
                .username(userInfo != null ? userInfo.getUsername() : "Unknown")
                .userAvatar(userInfo != null ? userInfo.getAvatar() : null)
                .targetId(comment.getTargetId())
                .type(comment.getType())
                .parentCommentId(comment.getParentCommentId())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .isEdited(comment.getIsEdited() != null && comment.getIsEdited())
                .isDeleted(comment.getIsDeleted())
                .likesCount(reactionStats.getLikesCount())
                .dislikesCount(reactionStats.getDislikesCount())
                .userReaction(currentUserReaction)
                .canEdit(canEdit)
                .canDelete(canDelete)
                .build();
    }

    /**
     * Преобразует сущность Comment в CommentResponseDTO без информации о дочерних комментариях.
     * Используется для отображения комментариев в профиле пользователя с подсчетом количества ответов.
     *
     * @param comment сущность комментария для преобразования
     * @return CommentResponseDTO без дочерних комментариев
     */
    private CommentResponseDTO mapToResponseDTOWithoutReplies(Comment comment) {
        UserInfoDTO userInfo = authService.getUserInfo(comment.getUserId());

        CommentReactionDTO reactionStats = getReactionStats(comment.getId());
        int repliesCount = commentRepository.findByParentCommentIdAndIsDeleted(comment.getId(), false).size();

        CurrentUserContext userContext = resolveCurrentUserContext();
        Long currentUserId = userContext.userId();
        boolean isAdmin = userContext.isAdmin();

        ReactionType currentUserReaction = null;
        if (currentUserId != null) {
            try {
                currentUserReaction = commentReactionRepository.findByCommentIdAndUserId(comment.getId(), currentUserId)
                        .map(CommentReaction::getReactionType)
                        .orElse(null);
            } catch (Exception ex) {
                log.debug("Could not resolve current user reaction for comment {}: {}", comment.getId(), ex.getMessage());
            }
        }

        boolean isDeleted = Boolean.TRUE.equals(comment.getIsDeleted());
        boolean canEdit = !isDeleted && currentUserId != null && currentUserId.equals(comment.getUserId());
        boolean canDelete = !isDeleted && (canEdit || isAdmin);

        return CommentResponseDTO.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .userId(comment.getUserId())
                .username(userInfo != null ? userInfo.getUsername() : "Unknown")
                .userAvatar(userInfo != null ? userInfo.getAvatar() : null)
                .targetId(comment.getTargetId())
                .type(comment.getType())
                .parentCommentId(comment.getParentCommentId())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .isEdited(comment.getIsEdited() != null && comment.getIsEdited())
                .isDeleted(comment.getIsDeleted())
                .likesCount(reactionStats.getLikesCount())
                .dislikesCount(reactionStats.getDislikesCount())
                .repliesCount(repliesCount)
                .userReaction(currentUserReaction)
                .canEdit(canEdit)
                .canDelete(canDelete)
                .build();
    }

    private CurrentUserContext resolveCurrentUserContext() {
        try {
            var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null) {
                return CurrentUserContext.EMPTY;
            }

            Long userId = null;
            boolean isAdmin = false;

            Object details = authentication.getDetails();
            if (details instanceof shadowshift.studio.commentservice.security.UserPrincipal userPrincipal) {
                userId = userPrincipal.getUserId();
                String role = userPrincipal.getRole();
                if (role != null && role.equalsIgnoreCase("ADMIN")) {
                    isAdmin = true;
                }
            }

            if (!isAdmin && authentication.getAuthorities() != null) {
                isAdmin = authentication.getAuthorities().stream()
                        .anyMatch(a -> {
                            String authority = a.getAuthority();
                            return authority != null && (authority.equalsIgnoreCase("ROLE_ADMIN") || authority.equalsIgnoreCase("ADMIN"));
                        });
            }

            return new CurrentUserContext(userId, isAdmin);
        } catch (Exception ex) {
            log.debug("Failed to resolve current user context: {}", ex.getMessage());
            return CurrentUserContext.EMPTY;
        }
    }

    private record CurrentUserContext(Long userId, boolean isAdmin) {
        private static final CurrentUserContext EMPTY = new CurrentUserContext(null, false);
    }
}
