package shadowshift.studio.forumservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.forumservice.entity.ForumThreadView;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ForumThreadViewRepository extends JpaRepository<ForumThreadView, Long> {
    
    /**
     * Проверить, просматривал ли пользователь тему
     */
    boolean existsByThreadIdAndUserId(Long threadId, Long userId);
    
    /**
     * Проверить, просматривал ли анонимный пользователь тему (по IP)
     */
    boolean existsByThreadIdAndIpAddress(Long threadId, String ipAddress);
    
    /**
     * Подсчитать уникальные просмотры темы
     */
    @Query("SELECT COUNT(DISTINCT CASE WHEN v.userId IS NOT NULL THEN v.userId ELSE v.ipAddress END) FROM ForumThreadView v WHERE v.threadId = :threadId")
    Long countUniqueViewsByThreadId(@Param("threadId") Long threadId);
    
    /**
     * Найти последние просмотры темы
     */
    List<ForumThreadView> findByThreadIdOrderByCreatedAtDesc(Long threadId);
    
    /**
     * Найти просмотры пользователя
     */
    List<ForumThreadView> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    /**
     * Подсчитать просмотры темы за период
     */
    @Query("SELECT COUNT(v) FROM ForumThreadView v WHERE v.threadId = :threadId AND v.createdAt >= :fromDate")
    Long countByThreadIdAndCreatedAtAfter(@Param("threadId") Long threadId, @Param("fromDate") LocalDateTime fromDate);
    
    /**
     * Найти топ просматриваемых тем за период
     */
    @Query("SELECT v.threadId, COUNT(v) as viewCount FROM ForumThreadView v WHERE v.createdAt >= :fromDate GROUP BY v.threadId ORDER BY viewCount DESC")
    List<Object[]> findTopViewedThreadsSince(@Param("fromDate") LocalDateTime fromDate);
    
    /**
     * Удалить старые записи просмотров (для очистки)
     */
    void deleteByCreatedAtBefore(LocalDateTime beforeDate);
}