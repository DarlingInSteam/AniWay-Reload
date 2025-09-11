package shadowshift.studio.mangaservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.mangaservice.entity.Manga;
import java.util.List;

/**
 * Репозиторий для работы с сущностями Manga.
 * Предоставляет методы для поиска и фильтрации манги в базе данных.
 *
 * @author ShadowShiftStudio
 */
@Repository
public interface MangaRepository extends JpaRepository<Manga, Long> {

    /**
     * Ищет манги по частичному совпадению названия, игнорируя регистр.
     *
     * @param title часть названия манги
     * @return список найденных манг
     */
    List<Manga> findByTitleContainingIgnoreCase(String title);

    /**
     * Возвращает все манги, отсортированные по дате создания в убывающем порядке.
     *
     * @return список манг
     */
    @Query("SELECT m FROM Manga m ORDER BY m.createdAt DESC")
    List<Manga> findAllOrderByCreatedAtDesc();

    /**
     * Ищет манги по статусу.
     *
     * @param status статус манги
     * @return список манг с указанным статусом
     */
    List<Manga> findByStatus(Manga.MangaStatus status);

    /**
     * Поиск манги по различным критериям.
     * Использует нативный SQL с явным приведением типов для решения проблем с кодировкой PostgreSQL.
     *
     * @param title название манги (частичное совпадение, игнорируя регистр)
     * @param author автор манги (частичное совпадение, игнорируя регистр)
     * @param genre жанр манги (частичное совпадение, игнорируя регистр)
     * @param status статус манги (точное совпадение)
     * @return список найденных манг, отсортированный по дате создания (новые первыми)
     */
    @Query(value = """
        SELECT * FROM manga m
        WHERE (:title IS NULL OR UPPER(CAST(m.title AS TEXT)) LIKE UPPER(CONCAT('%', CAST(:title AS TEXT), '%')))
        AND (:author IS NULL OR UPPER(CAST(m.author AS TEXT)) LIKE UPPER(CONCAT('%', CAST(:author AS TEXT), '%')))
        AND (:genre IS NULL OR UPPER(CAST(m.genre AS TEXT)) LIKE UPPER(CONCAT('%', CAST(:genre AS TEXT), '%')))
        AND (:status IS NULL OR m.status = :status)
        ORDER BY m.created_at DESC
    """, nativeQuery = true)
    List<Manga> searchManga(
        @Param("title") String title,
        @Param("author") String author,
        @Param("genre") String genre,
        @Param("status") String status
    );

    /**
     * Инкрементирует счетчик просмотров манги.
     * Использует COALESCE для корректной работы с NULL значениями.
     *
     * @param mangaId ID манги
     */
    @Modifying
    @Query("UPDATE Manga m SET m.views = COALESCE(m.views, 0) + 1 WHERE m.id = :mangaId")
    void incrementViews(@Param("mangaId") Long mangaId);
}
