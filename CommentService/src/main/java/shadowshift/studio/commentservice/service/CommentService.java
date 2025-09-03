package shadowshift.studio.commentservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.commentservice.dto.*;
import shadowshift.studio.commentservice.entity.Comment;
import shadowshift.studio.commentservice.entity.CommentReaction;
import shadowshift.studio.commentservice.enums.CommentType;
import shadowshift.studio.commentservice.enums.ReactionType;
import shadowshift.studio.commentservice.repository.CommentRepository;
import shadowshift.studio.commentservice.repository.CommentReactionRepository;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Сервис для работы с комментариями
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CommentService {

    private final CommentRepository commentRepository;
    private final CommentReactionRepository commentReactionRepository;
    private final AuthService authService;
    
    private static final int EDIT_TIME_LIMIT_DAYS = 7;

    /**
     * Создание нового комментария
     */
    @Transactional
    public CommentResponseDTO createComment(CommentCreateDTO createDTO, Long userId) {
        log.info("Creating comment for target {} with type {} by user {}", 
                createDTO.getTargetId(), createDTO.getType(), userId);
        
        // Проверяем существование родительского комментария, если указан
        if (createDTO.getParentCommentId() != null) {
            Comment parentComment = commentRepository.findById(createDTO.getParentCommentId())
                .orElseThrow(() -> new RuntimeException("Parent comment not found"));
            
            // Родительский комментарий должен быть к тому же объекту
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
        
        // Устанавливаем родительский комментарий, если есть
        if (createDTO.getParentCommentId() != null) {
            Comment parentComment = commentRepository.findById(createDTO.getParentCommentId())
                    .orElseThrow(() -> new RuntimeException("Parent comment not found"));
            comment.setParentComment(parentComment);
        }
        
        Comment savedComment = commentRepository.save(comment);
        log.info("Comment created with ID: {}", savedComment.getId());
        
        return mapToResponseDTO(savedComment);
    }

    /**
     * Обновление комментария
     */
    @Transactional
    public CommentResponseDTO updateComment(Long commentId, CommentUpdateDTO updateDTO, Long userId) {
        log.info("Updating comment {} by user {}", commentId, userId);
        
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));
        
        // Проверяем права на редактирование
        if (!comment.getUserId().equals(userId)) {
            throw new RuntimeException("You can only edit your own comments");
        }
        
        // Проверяем временные ограничения (7 дней)
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
     * Удаление комментария
     */
    @Transactional
    public void deleteComment(Long commentId, Long userId) {
        log.info("Deleting comment {} by user {}", commentId, userId);
        
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));
        
        // Проверяем права на удаление
        if (!comment.getUserId().equals(userId)) {
            throw new RuntimeException("You can only delete your own comments");
        }
        
        // Мягкое удаление
        comment.setIsDeleted(true);
        comment.setDeletedAt(LocalDateTime.now(ZoneOffset.UTC));
        comment.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
        
        commentRepository.save(comment);
        
        // Также мягко удаляем все дочерние комментарии
        deleteChildComments(commentId);
        
        log.info("Comment {} and its children deleted successfully", commentId);
    }

    /**
     * Рекурсивное удаление дочерних комментариев
     */
    private void deleteChildComments(Long parentCommentId) {
        List<Comment> children = commentRepository.findByParentCommentIdAndIsDeleted(parentCommentId, false);
        for (Comment child : children) {
            child.setIsDeleted(true);
            child.setDeletedAt(LocalDateTime.now(ZoneOffset.UTC));
            child.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
            commentRepository.save(child);
            
            // Рекурсивно удаляем детей
            deleteChildComments(child.getId());
        }
    }

    /**
     * Получение комментариев для определенного объекта
     */
    public List<CommentResponseDTO> getCommentsByTarget(Long targetId, CommentType type, Pageable pageable) {
        log.info("Getting comments for target {} with type {}", targetId, type);
        
        // Получаем только корневые комментарии (без родителя)
        Page<Comment> comments = commentRepository.findByTargetIdAndCommentTypeAndParentCommentIsNullAndIsDeleted(
                targetId, type, false, pageable);
        
        return comments.getContent().stream()
                .map(this::mapToResponseDTOWithChildren)
                .collect(Collectors.toList());
    }

    /**
     * Получение ответов на комментарий
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
     * Добавление реакции на комментарий
     */
    @Transactional
    public void addReaction(Long commentId, ReactionType reactionType, Long userId) {
        log.info("Adding reaction {} to comment {} by user {}", reactionType, commentId, userId);
        
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));
        
        if (comment.getIsDeleted()) {
            throw new RuntimeException("Cannot react to deleted comment");
        }
        
        // Проверяем, есть ли уже реакция от этого пользователя
        Optional<CommentReaction> existingReaction = 
                commentReactionRepository.findByCommentIdAndUserId(commentId, userId);
        
        if (existingReaction.isPresent()) {
            CommentReaction reaction = existingReaction.get();
            if (reaction.getReactionType() == reactionType) {
                // Убираем реакцию, если она такая же
                commentReactionRepository.delete(reaction);
                log.info("Removed existing reaction {} from comment {}", reactionType, commentId);
            } else {
                // Меняем тип реакции
                reaction.setReactionType(reactionType);
                commentReactionRepository.save(reaction);
                log.info("Changed reaction to {} for comment {}", reactionType, commentId);
            }
        } else {
            // Добавляем новую реакцию
            CommentReaction reaction = CommentReaction.builder()
                    .comment(comment)
                    .userId(userId)
                    .reactionType(reactionType)
                    .createdAt(LocalDateTime.now(ZoneOffset.UTC))
                    .build();
            
            commentReactionRepository.save(reaction);
            log.info("Added new reaction {} to comment {}", reactionType, commentId);
        }
    }

    /**
     * Получение статистики реакций для комментария
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
     * Маппинг в DTO с дочерними комментариями
     */
    private CommentResponseDTO mapToResponseDTOWithChildren(Comment comment) {
        CommentResponseDTO dto = mapToResponseDTO(comment);
        
        // Получаем дочерние комментарии (первый уровень)
        List<Comment> children = commentRepository.findByParentCommentIdAndIsDeleted(comment.getId(), false);
        List<CommentResponseDTO> childrenDTOs = children.stream()
                .map(this::mapToResponseDTOWithChildren) // Рекурсивный вызов для получения всех уровней
                .collect(Collectors.toList());
        
        dto.setReplies(childrenDTOs);
        dto.setRepliesCount(children.size());
        
        return dto;
    }

    /**
     * Маппинг Comment в CommentResponseDTO
     */
    private CommentResponseDTO mapToResponseDTO(Comment comment) {
        // Получаем информацию о пользователе через AuthService
        UserInfoDTO userInfo = authService.getUserInfo(comment.getUserId());
        
        // Получаем статистику реакций
        CommentReactionDTO reactionStats = getReactionStats(comment.getId());
        
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
                .build();
    }
}
