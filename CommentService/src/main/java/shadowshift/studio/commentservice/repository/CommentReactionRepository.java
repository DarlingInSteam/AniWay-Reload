package shadowshift.studio.commentservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.commentservice.entity.CommentReaction;
import shadowshift.studio.commentservice.enums.ReactionType;

import java.util.Optional;

/**
 * Репозиторий для работы с реакциями на комментарии
 */
@Repository
public interface CommentReactionRepository extends JpaRepository<CommentReaction, Long> {
    
    /**
     * Найти реакцию пользователя на комментарий
     */
    Optional<CommentReaction> findByCommentIdAndUserId(Long commentId, Long userId);
    
    /**
     * Подсчитать количество лайков для комментария
     */
    @Query("SELECT COUNT(r) FROM CommentReaction r WHERE r.comment.id = :commentId " +
           "AND r.reactionType = 'LIKE'")
    Long countLikesByCommentId(@Param("commentId") Long commentId);
    
    /**
     * Подсчитать количество дизлайков для комментария
     */
    @Query("SELECT COUNT(r) FROM CommentReaction r WHERE r.comment.id = :commentId " +
           "AND r.reactionType = 'DISLIKE'")
    Long countDislikesByCommentId(@Param("commentId") Long commentId);
    
    /**
     * Удалить реакцию пользователя на комментарий
     */
    void deleteByCommentIdAndUserId(Long commentId, Long userId);
    
    /**
     * Проверить, есть ли реакция пользователя на комментарий
     */
    boolean existsByCommentIdAndUserId(Long commentId, Long userId);
    
    /**
     * Метод для совместимости с сервисом
     */
    long countByCommentIdAndReactionType(Long commentId, ReactionType reactionType);
}
