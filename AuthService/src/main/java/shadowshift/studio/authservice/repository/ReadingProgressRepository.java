package shadowshift.studio.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.authservice.entity.ReadingProgress;

import java.util.List;
import java.util.Optional;

/**
 * Репозиторий для работы с прогрессом чтения.
 * Предоставляет методы для доступа к данным прогресса чтения в базе данных.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Repository
public interface ReadingProgressRepository extends JpaRepository<ReadingProgress, Long> {
    
    /**
     * Находит весь прогресс чтения пользователя.
     *
     * @param userId идентификатор пользователя
     * @return список прогресса чтения
     */
    List<ReadingProgress> findByUserId(Long userId);
    
    /**
     * Находит прогресс чтения пользователя для манги.
     *
     * @param userId идентификатор пользователя
     * @param mangaId идентификатор манги
     * @return список прогресса чтения
     */
    List<ReadingProgress> findByUserIdAndMangaId(Long userId, Long mangaId);
    
    /**
     * Находит прогресс чтения пользователя для главы.
     *
     * @param userId идентификатор пользователя
     * @param chapterId идентификатор главы
     * @return Optional с прогрессом чтения или пустой
     */
    Optional<ReadingProgress> findByUserIdAndChapterId(Long userId, Long chapterId);
    
    /**
     * Находит последний прогресс чтения для манги.
     *
     * @param userId идентификатор пользователя
     * @param mangaId идентификатор манги
     * @return список прогресса чтения, отсортированный по номеру главы
     */
    @Query("SELECT rp FROM ReadingProgress rp WHERE rp.userId = :userId AND rp.mangaId = :mangaId " +
           "ORDER BY rp.chapterNumber DESC")
    List<ReadingProgress> findLatestProgressForManga(@Param("userId") Long userId, @Param("mangaId") Long mangaId);
    
    /**
     * Находит завершенные главы пользователя.
     *
     * @param userId идентификатор пользователя
     * @return список завершенного прогресса чтения
     */
    @Query("SELECT rp FROM ReadingProgress rp WHERE rp.userId = :userId AND rp.isCompleted = true")
    List<ReadingProgress> findCompletedChapters(@Param("userId") Long userId);
    
    /**
     * Находит прогресс чтения пользователя по статусу завершения.
     *
     * @param userId идентификатор пользователя
     * @param isCompleted статус завершения
     * @return список прогресса чтения, отсортированный по дате обновления
     */
    @Query("SELECT rp FROM ReadingProgress rp WHERE rp.userId = :userId AND rp.isCompleted = :isCompleted ORDER BY rp.updatedAt DESC")
    List<ReadingProgress> findByUserIdAndIsCompletedOrderByUpdatedAtDesc(@Param("userId") Long userId, @Param("isCompleted") Boolean isCompleted);
    
    /**
     * Подсчитывает завершенные главы пользователя.
     *
     * @param userId идентификатор пользователя
     * @return количество завершенных глав
     */
    @Query("SELECT COUNT(rp) FROM ReadingProgress rp WHERE rp.userId = :userId AND rp.isCompleted = true")
    Long countCompletedChaptersByUser(@Param("userId") Long userId);
    
    /**
     * Подсчитывает уникальные манги пользователя.
     *
     * @param userId идентификатор пользователя
     * @return количество уникальных манг
     */
    @Query("SELECT COUNT(DISTINCT rp.mangaId) FROM ReadingProgress rp WHERE rp.userId = :userId")
    Long countDistinctMangasByUser(@Param("userId") Long userId);
    
    /**
     * Подсчитывает весь прогресс чтения пользователя.
     *
     * @param userId идентификатор пользователя
     * @return количество записей прогресса
     */
    Long countByUserId(Long userId);
}
