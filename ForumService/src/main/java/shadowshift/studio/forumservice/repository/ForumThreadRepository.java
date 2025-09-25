package shadowshift.studio.forumservice.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.forumservice.entity.ForumThread;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ForumThreadRepository extends JpaRepository<ForumThread, Long> {
    
    /**
     * Найти темы по категории с пагинацией, не удаленные
     */
    @Query("SELECT t FROM ForumThread t WHERE t.categoryId = :categoryId AND t.isDeleted = false ORDER BY t.isPinned DESC, t.lastActivityAt DESC")
    Page<ForumThread> findByCategoryIdAndNotDeleted(@Param("categoryId") Long categoryId, Pageable pageable);
    
    /**
     * Найти все темы с пагинацией, не удаленные
     */
    @Query("SELECT t FROM ForumThread t WHERE t.isDeleted = false ORDER BY t.isPinned DESC, t.lastActivityAt DESC")
    Page<ForumThread> findAllNotDeleted(Pageable pageable);
    
    /**
     * Найти тему по ID, не удаленную
     */
    @Query("SELECT t FROM ForumThread t WHERE t.id = :id AND t.isDeleted = false")
    Optional<ForumThread> findByIdAndNotDeleted(@Param("id") Long id);
    
    /**
     * Найти темы по автору
     */
    @Query("SELECT t FROM ForumThread t WHERE t.authorId = :authorId AND t.isDeleted = false ORDER BY t.createdAt DESC")
    Page<ForumThread> findByAuthorIdAndNotDeleted(@Param("authorId") Long authorId, Pageable pageable);
    
    /**
     * Найти темы связанные с мангой
     */
    @Query("SELECT t FROM ForumThread t WHERE t.mangaId = :mangaId AND t.isDeleted = false ORDER BY t.lastActivityAt DESC")
    List<ForumThread> findByMangaIdAndNotDeleted(@Param("mangaId") Long mangaId);
    
    /**
     * Поиск тем по тексту (полнотекстовый поиск)
     */
    @Query(value = "SELECT * FROM forum_threads t WHERE t.is_deleted = false AND " +
                   "t.search_vector @@ to_tsquery('russian', :searchQuery) " +
                   "ORDER BY ts_rank(t.search_vector, to_tsquery('russian', :searchQuery)) DESC",
           nativeQuery = true)
    Page<ForumThread> searchByText(@Param("searchQuery") String searchQuery, Pageable pageable);
    
    /**
     * Найти закрепленные темы в категории
     */
    @Query("SELECT t FROM ForumThread t WHERE t.categoryId = :categoryId AND t.isPinned = true AND t.isDeleted = false ORDER BY t.lastActivityAt DESC")
    List<ForumThread> findPinnedByCategoryId(@Param("categoryId") Long categoryId);
    
    /**
     * Обновить счетчик просмотров
     */
    @Modifying
    @Query("UPDATE ForumThread t SET t.viewsCount = t.viewsCount + 1 WHERE t.id = :threadId")
    void incrementViewsCount(@Param("threadId") Long threadId);
    
    /**
     * Обновить последнюю активность в теме
     */
    @Modifying
    @Query("UPDATE ForumThread t SET t.lastActivityAt = :activityTime, t.lastReplyAt = :replyTime, t.lastReplyUserId = :userId WHERE t.id = :threadId")
    void updateLastActivity(@Param("threadId") Long threadId, 
                           @Param("activityTime") LocalDateTime activityTime,
                           @Param("replyTime") LocalDateTime replyTime, 
                           @Param("userId") Long userId);
    
    /**
     * Найти топ активных тем за период
     */
    @Query("SELECT t FROM ForumThread t WHERE t.isDeleted = false AND t.lastActivityAt >= :fromDate ORDER BY t.repliesCount DESC, t.viewsCount DESC")
    Page<ForumThread> findTopActiveThreads(@Param("fromDate") LocalDateTime fromDate, Pageable pageable);
    
    /**
     * Подсчитать общее количество тем в категории
     */
    @Query("SELECT COUNT(t) FROM ForumThread t WHERE t.categoryId = :categoryId AND t.isDeleted = false")
    Long countByCategoryIdAndNotDeleted(@Param("categoryId") Long categoryId);
    
    /**
     * Найти темы автора в определенной категории
     */
    @Query("SELECT t FROM ForumThread t WHERE t.authorId = :authorId AND t.categoryId = :categoryId AND t.isDeleted = false ORDER BY t.createdAt DESC")
    Page<ForumThread> findByAuthorIdAndCategoryIdAndNotDeleted(@Param("authorId") Long authorId, @Param("categoryId") Long categoryId, Pageable pageable);

        /**
         * Топ тем (all-time) по количеству ответов, затем лайков, затем просмотров.
         */
        @Query("SELECT t FROM ForumThread t WHERE t.isDeleted = false ORDER BY t.repliesCount DESC, t.likesCount DESC, t.viewsCount DESC, t.createdAt DESC")
        org.springframework.data.domain.Page<ForumThread> findTopThreadsAllTime(org.springframework.data.domain.Pageable pageable);

        /**
         * Топ тем за период (activity window) по repliesCount.
         */
        @Query("SELECT t FROM ForumThread t WHERE t.isDeleted = false AND t.createdAt >= :fromDate ORDER BY t.repliesCount DESC, t.likesCount DESC, t.createdAt DESC")
        org.springframework.data.domain.Page<ForumThread> findTopThreadsSince(@Param("fromDate") java.time.LocalDateTime fromDate, org.springframework.data.domain.Pageable pageable);
}