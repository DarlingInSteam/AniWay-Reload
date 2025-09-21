package shadowshift.studio.forumservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.forumservice.entity.ForumReaction;

import java.util.List;
import java.util.Optional;

@Repository
public interface ForumReactionRepository extends JpaRepository<ForumReaction, Long> {
    
    /**
     * Найти реакцию пользователя на конкретный объект
     */
    Optional<ForumReaction> findByUserIdAndTargetTypeAndTargetId(
            Long userId, 
            ForumReaction.TargetType targetType, 
            Long targetId
    );
    
    /**
     * Найти все реакции на объект
     */
    List<ForumReaction> findByTargetTypeAndTargetId(
            ForumReaction.TargetType targetType, 
            Long targetId
    );
    
    /**
     * Подсчитать лайки для объекта
     */
    @Query("SELECT COUNT(r) FROM ForumReaction r WHERE r.targetType = :targetType AND r.targetId = :targetId AND r.reactionType = 'LIKE'")
    Long countLikesByTarget(@Param("targetType") ForumReaction.TargetType targetType, @Param("targetId") Long targetId);
    
    /**
     * Подсчитать дизлайки для объекта
     */
    @Query("SELECT COUNT(r) FROM ForumReaction r WHERE r.targetType = :targetType AND r.targetId = :targetId AND r.reactionType = 'DISLIKE'")
    Long countDislikesByTarget(@Param("targetType") ForumReaction.TargetType targetType, @Param("targetId") Long targetId);
    
    /**
     * Найти реакции пользователя
     */
    List<ForumReaction> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    /**
     * Найти все реакции пользователя определенного типа
     */
    List<ForumReaction> findByUserIdAndReactionTypeOrderByCreatedAtDesc(
            Long userId, 
            ForumReaction.ReactionType reactionType
    );
    
    /**
     * Проверить, есть ли реакция пользователя на объект
     */
    boolean existsByUserIdAndTargetTypeAndTargetId(
            Long userId, 
            ForumReaction.TargetType targetType, 
            Long targetId
    );
    
    /**
     * Удалить реакцию пользователя на объект
     */
    void deleteByUserIdAndTargetTypeAndTargetId(
            Long userId, 
            ForumReaction.TargetType targetType, 
            Long targetId
    );
    
    /**
     * Найти пользователей, которые лайкнули объект
     */
    @Query("SELECT r.userId FROM ForumReaction r WHERE r.targetType = :targetType AND r.targetId = :targetId AND r.reactionType = 'LIKE'")
    List<Long> findUserIdsWhoLiked(@Param("targetType") ForumReaction.TargetType targetType, @Param("targetId") Long targetId);
}