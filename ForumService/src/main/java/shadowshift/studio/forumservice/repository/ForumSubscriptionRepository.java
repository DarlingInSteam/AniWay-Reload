package shadowshift.studio.forumservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.forumservice.entity.ForumSubscription;

import java.util.List;
import java.util.Optional;

@Repository
public interface ForumSubscriptionRepository extends JpaRepository<ForumSubscription, Long> {
    
    /**
     * Найти подписку пользователя на тему
     */
    Optional<ForumSubscription> findByUserIdAndThreadId(Long userId, Long threadId);
    
    /**
     * Найти все активные подписки пользователя
     */
    List<ForumSubscription> findByUserIdAndIsActiveOrderByCreatedAtDesc(Long userId, Boolean isActive);
    
    /**
     * Найти всех подписчиков темы
     */
    @Query("SELECT s.userId FROM ForumSubscription s WHERE s.threadId = :threadId AND s.isActive = true")
    List<Long> findActiveSubscriberUserIds(@Param("threadId") Long threadId);
    
    /**
     * Подсчитать количество подписчиков темы
     */
    @Query("SELECT COUNT(s) FROM ForumSubscription s WHERE s.threadId = :threadId AND s.isActive = true")
    Long countActiveSubscribersByThreadId(@Param("threadId") Long threadId);
    
    /**
     * Проверить, подписан ли пользователь на тему
     */
    @Query("SELECT COUNT(s) > 0 FROM ForumSubscription s WHERE s.userId = :userId AND s.threadId = :threadId AND s.isActive = true")
    boolean isUserSubscribedToThread(@Param("userId") Long userId, @Param("threadId") Long threadId);
    
    /**
     * Найти все подписки на темы в определенной категории
     */
    @Query("SELECT s FROM ForumSubscription s JOIN ForumThread t ON s.threadId = t.id WHERE t.categoryId = :categoryId AND s.isActive = true")
    List<ForumSubscription> findActiveSubscriptionsByCategoryId(@Param("categoryId") Long categoryId);
    
    /**
     * Деактивировать все подписки пользователя
     */
    @Query("UPDATE ForumSubscription s SET s.isActive = false WHERE s.userId = :userId")
    void deactivateAllUserSubscriptions(@Param("userId") Long userId);
}