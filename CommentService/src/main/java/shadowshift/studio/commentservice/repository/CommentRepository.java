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
 * Репозиторий для работы с комментариями.
 * Предоставляет методы для выполнения CRUD операций и кастомных запросов к комментариям,
 * включая работу с древовидной структурой и мягким удалением.
 *
 * @author ShadowShiftStudio
 */
@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    /**
     * Получить все корневые комментарии для объекта указанного типа с пагинацией.
     * Возвращает только не удаленные комментарии без родительских комментариев.
     *
     * @param commentType тип комментария
     * @param targetId идентификатор целевого объекта
     * @param pageable параметры пагинации и сортировки
     * @return страница корневых комментариев
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
     * Получить все ответы на указанный комментарий.
     * Возвращает только не удаленные ответы, отсортированные по времени создания.
     *
     * @param parentId идентификатор родительского комментария
     * @return список ответов на комментарий
     */
    @Query("SELECT c FROM Comment c WHERE c.parentComment.id = :parentId " +
           "AND c.isDeleted = false ORDER BY c.createdAt ASC")
    List<Comment> findRepliesByParentId(@Param("parentId") Long parentId);

    /**
     * Получить комментарий по идентификатору с проверкой, что он не удален.
     *
     * @param id идентификатор комментария
     * @return Optional с комментарием или пустой Optional если комментарий удален или не найден
     */
    @Query("SELECT c FROM Comment c WHERE c.id = :id AND c.isDeleted = false")
    Optional<Comment> findByIdAndNotDeleted(@Param("id") Long id);

    /**
     * Получить все корневые комментарии пользователя с пагинацией.
     * Возвращает только не удаленные комментарии без ответов.
     *
     * @param userId идентификатор пользователя
     * @param pageable параметры пагинации и сортировки
     * @return страница комментариев пользователя
     */
    @Query("SELECT c FROM Comment c WHERE c.userId = :userId " +
           "AND c.parentComment IS NULL AND c.isDeleted = false " +
           "ORDER BY c.createdAt DESC")
    Page<Comment> findUserRootComments(@Param("userId") Long userId, Pageable pageable);

    /**
     * Получить все корневые комментарии пользователя без пагинации.
     * Используется для отображения в профиле пользователя.
     *
     * @param userId идентификатор пользователя
     * @return список всех корневых комментариев пользователя
     */
    @Query("SELECT c FROM Comment c WHERE c.userId = :userId " +
           "AND c.parentComment IS NULL AND c.isDeleted = false " +
           "ORDER BY c.createdAt DESC")
    List<Comment> findAllUserRootComments(@Param("userId") Long userId);

    /**
     * Получить количество комментариев пользователя.
     * Подсчитывает все комментарии пользователя, включая ответы.
     *
     * @param userId идентификатор пользователя
     * @return количество комментариев пользователя
     */
    @Query("SELECT COUNT(c) FROM Comment c WHERE c.userId = :userId " +
           "AND c.isDeleted = false")
    Long countByUserId(@Param("userId") Long userId);

    /**
     * Получить количество комментариев для объекта указанного типа.
     * Подсчитывает все комментарии, включая ответы.
     *
     * @param commentType тип комментария
     * @param targetId идентификатор целевого объекта
     * @return количество комментариев для объекта
     */
    @Query("SELECT COUNT(c) FROM Comment c WHERE c.commentType = :commentType " +
           "AND c.targetId = :targetId AND c.isDeleted = false")
    Long countByTypeAndTarget(
        @Param("commentType") CommentType commentType,
        @Param("targetId") Long targetId
    );

    /**
     * Выполнить мягкое удаление комментария и всех его ответов.
     * Устанавливает флаг isDeleted в true для комментария и всех его ответов.
     *
     * @param id идентификатор комментария для удаления
     */
    @Modifying
    @Query("UPDATE Comment c SET c.isDeleted = true WHERE c.id = :id OR c.parentComment.id = :id")
    void softDeleteCommentAndReplies(@Param("id") Long id);

    /**
     * Обновить счетчики лайков и дизлайков для комментария.
     *
     * @param commentId идентификатор комментария
     * @param likesCount новое количество лайков
     * @param dislikesCount новое количество дизлайков
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
     * Выполнить поиск комментариев по содержимому для объекта указанного типа.
     * Ищет в содержимом комментариев без учета регистра.
     *
     * @param commentType тип комментария
     * @param targetId идентификатор целевого объекта
     * @param searchTerm поисковый запрос
     * @param pageable параметры пагинации и сортировки
     * @return страница найденных комментариев
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
     * Получить ответы на комментарий с фильтром по статусу удаления.
     * Метод для совместимости с внешними сервисами.
     *
     * @param parentCommentId идентификатор родительского комментария
     * @param isDeleted статус удаления
     * @return список ответов
     */
    @Query("SELECT c FROM Comment c WHERE c.parentComment.id = :parentCommentId AND c.isDeleted = :isDeleted")
    List<Comment> findByParentCommentIdAndIsDeleted(@Param("parentCommentId") Long parentCommentId, @Param("isDeleted") boolean isDeleted);

    /**
     * Получить ответы на комментарий с фильтром по статусу удаления и пагинацией.
     * Метод для совместимости с внешними сервисами.
     *
     * @param parentCommentId идентификатор родительского комментария
     * @param isDeleted статус удаления
     * @param pageable параметры пагинации
     * @return страница ответов
     */
    @Query("SELECT c FROM Comment c WHERE c.parentComment.id = :parentCommentId AND c.isDeleted = :isDeleted")
    Page<Comment> findByParentCommentIdAndIsDeleted(@Param("parentCommentId") Long parentCommentId, @Param("isDeleted") boolean isDeleted, Pageable pageable);

    /**
     * Получить корневые комментарии для объекта с фильтром по статусу удаления.
     * Метод для совместимости с внешними сервисами.
     *
     * @param targetId идентификатор целевого объекта
     * @param commentType тип комментария
     * @param isDeleted статус удаления
     * @param pageable параметры пагинации
     * @return страница корневых комментариев
     */
    @Query("SELECT c FROM Comment c WHERE c.targetId = :targetId AND c.commentType = :commentType AND c.parentComment IS NULL AND c.isDeleted = :isDeleted")
    Page<Comment> findByTargetIdAndCommentTypeAndParentCommentIsNullAndIsDeleted(
        @Param("targetId") Long targetId,
        @Param("commentType") CommentType commentType,
        @Param("isDeleted") boolean isDeleted,
        Pageable pageable
    );

    /**
     * Подсчитать все комментарии для объекта указанного типа (включая ответы).
     * Метод для совместимости с внешними сервисами.
     *
     * @param targetId идентификатор целевого объекта
     * @param commentType тип комментария
     * @param isDeleted статус удаления
     * @return количество комментариев
     */
    long countByTargetIdAndCommentTypeAndIsDeleted(Long targetId, CommentType commentType, boolean isDeleted);

       @Query("SELECT c.targetId, COUNT(c) FROM Comment c WHERE c.commentType = :commentType AND c.targetId IN :targetIds AND c.isDeleted = false GROUP BY c.targetId")
       List<Object[]> countByTypeAndTargetIds(
              @Param("commentType") CommentType commentType,
              @Param("targetIds") List<Long> targetIds
       );

       /**
        * Топ комментариев (all-time) по (likesCount - dislikesCount) затем likesCount.
        */
       @Query("SELECT c FROM Comment c WHERE c.isDeleted = false ORDER BY (c.likesCount - c.dislikesCount) DESC, c.likesCount DESC, c.createdAt DESC")
       org.springframework.data.domain.Page<Comment> findTopCommentsAllTime(org.springframework.data.domain.Pageable pageable);

       /**
        * Топ комментариев за период.
        */
       @Query("SELECT c FROM Comment c WHERE c.isDeleted = false AND c.createdAt >= :fromDate ORDER BY (c.likesCount - c.dislikesCount) DESC, c.likesCount DESC, c.createdAt DESC")
       org.springframework.data.domain.Page<Comment> findTopCommentsSince(@Param("fromDate") java.time.LocalDateTime fromDate, org.springframework.data.domain.Pageable pageable);

              /**
               * Placeholder hook for moderation backlog counting. When a dedicated moderation queue is introduced,
               * this method can be overridden with {@code @Query}. For now, the monitoring dashboard expects
               * a numeric value, so we return zero by default.
               */
              default long countPendingModeration() {
                     return 0L;
              }
}
