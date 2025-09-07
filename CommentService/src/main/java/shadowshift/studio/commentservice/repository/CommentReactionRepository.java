package shadowshift.studio.commentservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.commentservice.entity.CommentReaction;
import shadowshift.studio.commentservice.enums.ReactionType;

import java.util.Optional;

/**
 * Репозиторий для работы с реакциями на комментарии.
 * Предоставляет методы для выполнения CRUD операций и кастомных запросов к реакциям.
 *
 * @author ShadowShiftStudio
 */
@Repository
public interface CommentReactionRepository extends JpaRepository<CommentReaction, Long> {

    /**
     * Найти реакцию пользователя на указанный комментарий.
     *
     * @param commentId идентификатор комментария
     * @param userId идентификатор пользователя
     * @return Optional с найденной реакцией или пустой Optional
     */
    Optional<CommentReaction> findByCommentIdAndUserId(Long commentId, Long userId);

    /**
     * Подсчитать количество лайков для указанного комментария.
     *
     * @param commentId идентификатор комментария
     * @return количество лайков
     */
    @Query("SELECT COUNT(r) FROM CommentReaction r WHERE r.comment.id = :commentId " +
           "AND r.reactionType = 'LIKE'")
    Long countLikesByCommentId(@Param("commentId") Long commentId);

    /**
     * Подсчитать количество дизлайков для указанного комментария.
     *
     * @param commentId идентификатор комментария
     * @return количество дизлайков
     */
    @Query("SELECT COUNT(r) FROM CommentReaction r WHERE r.comment.id = :commentId " +
           "AND r.reactionType = 'DISLIKE'")
    Long countDislikesByCommentId(@Param("commentId") Long commentId);

    /**
     * Удалить реакцию пользователя на указанный комментарий.
     *
     * @param commentId идентификатор комментария
     * @param userId идентификатор пользователя
     */
    void deleteByCommentIdAndUserId(Long commentId, Long userId);

    /**
     * Проверить, существует ли реакция пользователя на указанный комментарий.
     *
     * @param commentId идентификатор комментария
     * @param userId идентификатор пользователя
     * @return true, если реакция существует
     */
    boolean existsByCommentIdAndUserId(Long commentId, Long userId);

    /**
     * Подсчитать количество реакций указанного типа для комментария.
     * Метод для совместимости с внешними сервисами.
     *
     * @param commentId идентификатор комментария
     * @param reactionType тип реакции
     * @return количество реакций
     */
    long countByCommentIdAndReactionType(Long commentId, ReactionType reactionType);
}
