package shadowshift.studio.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.authservice.entity.Bookmark;
import shadowshift.studio.authservice.entity.BookmarkStatus;

import java.util.List;
import java.util.Optional;

/**
 * Репозиторий для работы с закладками.
 * Предоставляет методы для доступа к данным закладок в базе данных.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Repository
public interface BookmarkRepository extends JpaRepository<Bookmark, Long>, BookmarkRepositoryCustom {
    
    /**
     * Находит все закладки пользователя.
     *
     * @param userId идентификатор пользователя
     * @return список закладок
     */
    List<Bookmark> findByUserId(Long userId);
    
    /**
     * Находит закладки пользователя по статусу.
     *
     * @param userId идентификатор пользователя
     * @param status статус закладки
     * @return список закладок
     */
    List<Bookmark> findByUserIdAndStatus(Long userId, BookmarkStatus status);
    
    /**
     * Находит избранные закладки пользователя.
     *
     * @param userId идентификатор пользователя
     * @return список закладок
     */
    List<Bookmark> findByUserIdAndIsFavoriteTrue(Long userId);
    
    /**
     * Находит закладку пользователя для манги.
     *
     * @param userId идентификатор пользователя
     * @param mangaId идентификатор манги
     * @return Optional с закладкой или пустой
     */
    Optional<Bookmark> findByUserIdAndMangaId(Long userId, Long mangaId);
    
    /**
     * Проверяет существование закладки для пользователя и манги.
     *
     * @param userId идентификатор пользователя
     * @param mangaId идентификатор манги
     * @return true, если закладка существует
     */
    boolean existsByUserIdAndMangaId(Long userId, Long mangaId);
    
    /**
     * Подсчитывает закладки пользователя по статусу.
     *
     * @param userId идентификатор пользователя
     * @param status статус закладки
     * @return количество закладок
     */
    @Query("SELECT COUNT(b) FROM Bookmark b WHERE b.userId = :userId AND b.status = :status")
    Long countByUserIdAndStatus(@Param("userId") Long userId, @Param("status") BookmarkStatus status);
    
    /**
     * Удаляет закладку пользователя для манги.
     *
     * @param userId идентификатор пользователя
     * @param mangaId идентификатор манги
     */
    void deleteByUserIdAndMangaId(Long userId, Long mangaId);
    
    /**
     * Удаляет все закладки для манги.
     *
     * @param mangaId идентификатор манги
     * @return количество удаленных закладок
     */
    Long deleteByMangaId(Long mangaId);

    /**
     * Находит все закладки по идентификатору манги.
     * @param mangaId идентификатор манги
     */
    List<Bookmark> findByMangaId(Long mangaId);

    /**
     * Подсчитывает количество уникальных пользователей, у которых манга находится в закладках.
     *
     * @param mangaId идентификатор манги
     * @return количество пользователей
     */
    @Query("SELECT COUNT(DISTINCT b.userId) FROM Bookmark b WHERE b.mangaId = :mangaId")
    Long countDistinctUsersByMangaId(@Param("mangaId") Long mangaId);
}
