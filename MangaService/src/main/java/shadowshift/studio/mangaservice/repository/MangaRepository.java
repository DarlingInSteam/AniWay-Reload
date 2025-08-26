package shadowshift.studio.mangaservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.mangaservice.entity.Manga;
import java.util.List;

@Repository
public interface MangaRepository extends JpaRepository<Manga, Long> {

    // Поиск по названию (для MVP не нужен, но может пригодиться)
    List<Manga> findByTitleContainingIgnoreCase(String title);

    // Получение всех манг, отсортированных по дате создания (для каталога)
    @Query("SELECT m FROM Manga m ORDER BY m.createdAt DESC")
    List<Manga> findAllOrderByCreatedAtDesc();

    // Получение манг по статусу
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
}
