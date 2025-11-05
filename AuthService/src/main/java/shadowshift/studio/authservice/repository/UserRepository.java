package shadowshift.studio.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.authservice.entity.User;
import shadowshift.studio.authservice.entity.Role;
import shadowshift.studio.authservice.entity.BanType;
import java.time.LocalDateTime;

import java.util.List;
import java.util.Optional;

/**
 * Репозиторий для работы с пользователями.
 * Предоставляет методы для доступа к данным пользователей в базе данных.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
    
    /**
     * Находит пользователя по имени пользователя.
     *
     * @param username имя пользователя
     * @return Optional с пользователем или пустой
     */
    Optional<User> findByUsername(String username);
    
    /**
     * Находит пользователя по email.
     *
     * @param email email пользователя
     * @return Optional с пользователем или пустой
     */
    Optional<User> findByEmail(String email);
    
    /**
     * Находит пользователя по имени пользователя или email.
     *
     * @param username имя пользователя
     * @param email email пользователя
     * @return Optional с пользователем или пустой
     */
    Optional<User> findByUsernameOrEmail(String username, String email);

    Optional<User> findByTelegramChatId(Long telegramChatId);

    // Aggregation helpers
    long countByRole(Role role);
    long countByBanTypeNot(BanType banType);

    long countByCreatedAtAfter(LocalDateTime createdAfter);

    @Query("SELECT COUNT(u) FROM User u WHERE (u.lastLogin IS NOT NULL AND u.lastLogin >= :cutoff) OR (u.lastLogin IS NULL AND u.createdAt >= :cutoff)")
    long countActiveSince(@Param("cutoff") LocalDateTime cutoff);
    
    /**
     * Проверяет существование пользователя по имени.
     *
     * @param username имя пользователя
     * @return true, если пользователь существует
     */
    boolean existsByUsername(String username);
    
    /**
     * Проверяет существование пользователя по email.
     *
     * @param email email пользователя
     * @return true, если пользователь существует
     */
    boolean existsByEmail(String email);
    
    /**
     * Выполняет поиск пользователей по имени или отображаемому имени.
     *
     * @param query строка поиска
     * @return список пользователей
     */
    @Query("SELECT u FROM User u WHERE " +
           "LOWER(u.username) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(u.displayName) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<User> searchUsers(@Param("query") String query);
    
    /**
     * Находит топ-читателей, отсортированных по количеству прочитанных глав.
     *
     * @return список пользователей
     */
    @Query("SELECT u FROM User u ORDER BY u.chaptersReadCount DESC")
    List<User> findTopReaders();

    /**
     * Возвращает пользователей, отсортированных по количеству поставленных лайков.
     * Используйте Pageable для ограничения количества результатов.
     *
     * @param pageable параметры пагинации (номер страницы всегда 0, размер = лимит)
     * @return страница пользователей
     */
    @Query("SELECT u FROM User u ORDER BY u.likesGivenCount DESC")
    org.springframework.data.domain.Page<User> findTopByLikes(org.springframework.data.domain.Pageable pageable);

    /**
     * Возвращает пользователей, отсортированных по количеству комментариев.
     * @param pageable параметры пагинации
     * @return страница пользователей
     */
    @Query("SELECT u FROM User u ORDER BY u.commentsCount DESC")
    org.springframework.data.domain.Page<User> findTopByComments(org.springframework.data.domain.Pageable pageable);
}
