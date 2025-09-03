package shadowshift.studio.commentservice.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.commentservice.entity.Comment;
import shadowshift.studio.commentservice.enums.CommentType;

import java.util.List;
import java.util.Optional;

/**
 * Репозиторий для работы с комментариями
 */
@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    
    /**
     * Получить все корневые комментарии для объекта определенного типа
     */
    @Query("SELECT c FROM Comment c WHERE c.commentType = :commentType " +
           "AND c.targetId = :targetId AND c.parentComment IS NULL " +
           "AND c.isDeleted = false ORDER BY c.createdAt DESC")
    Page<Comment> findRootCommentsByTypeAndTarget(
        @Param("commentType") CommentType commentType,
        @Param("targetId") Long targetId,
        Pageable pageable
    );
    
    /**
     * Получить все ответы на комментарий
     */
    @Query("SELECT c FROM Comment c WHERE c.parentComment.id = :parentId " +
           "AND c.isDeleted = false ORDER BY c.createdAt ASC")
    List<Comment> findRepliesByParentId(@Param("parentId") Long parentId);
    
    /**
     * Получить комментарий с проверкой, что он не удален
     */
    @Query("SELECT c FROM Comment c WHERE c.id = :id AND c.isDeleted = false")
    Optional<Comment> findByIdAndNotDeleted(@Param("id") Long id);
    
    /**
     * Получить все комментарии пользователя (без ответов)
     */
    @Query("SELECT c FROM Comment c WHERE c.userId = :userId " +
           "AND c.parentComment IS NULL AND c.isDeleted = false " +
           "ORDER BY c.createdAt DESC")
    Page<Comment> findUserRootComments(@Param("userId") Long userId, Pageable pageable);
    
    /**
     * Получить количество комментариев пользователя
     */
    @Query("SELECT COUNT(c) FROM Comment c WHERE c.userId = :userId " +
           "AND c.isDeleted = false")
    Long countByUserId(@Param("userId") Long userId);
    
    /**
     * Получить количество комментариев для объекта
     */
    @Query("SELECT COUNT(c) FROM Comment c WHERE c.commentType = :commentType " +
           "AND c.targetId = :targetId AND c.isDeleted = false")
    Long countByTypeAndTarget(
        @Param("commentType") CommentType commentType,
        @Param("targetId") Long targetId
    );
    
    /**
     * Мягкое удаление комментария и всех его ответов
     */
    @Modifying
    @Query("UPDATE Comment c SET c.isDeleted = true WHERE c.id = :id OR c.parentComment.id = :id")
    void softDeleteCommentAndReplies(@Param("id") Long id);
    
    /**
     * Обновить счетчики лайков/дизлайков
     */
    @Modifying
    @Query("UPDATE Comment c SET c.likesCount = :likesCount, c.dislikesCount = :dislikesCount " +
           "WHERE c.id = :commentId")
    void updateReactionCounts(
        @Param("commentId") Long commentId,
        @Param("likesCount") Integer likesCount,
        @Param("dislikesCount") Integer dislikesCount
    );
    
    /**
     * Поиск комментариев по содержимому
     */
    @Query("SELECT c FROM Comment c WHERE c.commentType = :commentType " +
           "AND c.targetId = :targetId AND c.isDeleted = false " +
           "AND LOWER(c.content) LIKE LOWER(CONCAT('%', :searchTerm, '%')) " +
           "ORDER BY c.createdAt DESC")
    Page<Comment> searchComments(
        @Param("commentType") CommentType commentType,
        @Param("targetId") Long targetId,
        @Param("searchTerm") String searchTerm,
        Pageable pageable
    );
    
    /**
     * Методы для совместимости с сервисом
     */
    @Query("SELECT c FROM Comment c WHERE c.parentComment.id = :parentCommentId AND c.isDeleted = :isDeleted")
    List<Comment> findByParentCommentIdAndIsDeleted(@Param("parentCommentId") Long parentCommentId, @Param("isDeleted") boolean isDeleted);
    
    @Query("SELECT c FROM Comment c WHERE c.parentComment.id = :parentCommentId AND c.isDeleted = :isDeleted")
    Page<Comment> findByParentCommentIdAndIsDeleted(@Param("parentCommentId") Long parentCommentId, @Param("isDeleted") boolean isDeleted, Pageable pageable);
    
    @Query("SELECT c FROM Comment c WHERE c.targetId = :targetId AND c.commentType = :commentType AND c.parentComment IS NULL AND c.isDeleted = :isDeleted")
    Page<Comment> findByTargetIdAndCommentTypeAndParentCommentIsNullAndIsDeleted(
        @Param("targetId") Long targetId, 
        @Param("commentType") CommentType commentType, 
        @Param("isDeleted") boolean isDeleted, 
        Pageable pageable
    );
}
