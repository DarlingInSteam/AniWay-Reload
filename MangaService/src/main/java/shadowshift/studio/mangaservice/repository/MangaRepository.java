package shadowshift.studio.mangaservice.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
     * Возвращает все манги с пагинацией и сортировкой.
     * Поддерживает все поля сортировки включая комплексную сортировку по популярности.
     *
     * @param sortBy поле для сортировки
     * @param sortOrder направление сортировки
     * @param pageable параметры пагинации
     * @return страница манг
     */
    @Query("""
        SELECT m FROM Manga m
        ORDER BY
            CASE WHEN :sortBy = 'title' AND :sortOrder = 'asc' THEN m.title END ASC,
            CASE WHEN :sortBy = 'title' AND :sortOrder = 'desc' THEN m.title END DESC,
            CASE WHEN :sortBy = 'author' AND :sortOrder = 'asc' THEN m.author END ASC,
            CASE WHEN :sortBy = 'author' AND :sortOrder = 'desc' THEN m.author END DESC,
            CASE WHEN :sortBy = 'createdAt' AND :sortOrder = 'asc' THEN m.createdAt END ASC,
            CASE WHEN :sortBy = 'createdAt' AND :sortOrder = 'desc' THEN m.createdAt END DESC,
            CASE WHEN :sortBy = 'updatedAt' AND :sortOrder = 'asc' THEN m.updatedAt END ASC,
            CASE WHEN :sortBy = 'updatedAt' AND :sortOrder = 'desc' THEN m.updatedAt END DESC,
            CASE WHEN :sortBy = 'views' AND :sortOrder = 'asc' THEN m.views END ASC,
            CASE WHEN :sortBy = 'views' AND :sortOrder = 'desc' THEN m.views END DESC,
            CASE WHEN :sortBy = 'rating' AND :sortOrder = 'asc' THEN m.rating END ASC,
            CASE WHEN :sortBy = 'rating' AND :sortOrder = 'desc' THEN m.rating END DESC,
            CASE WHEN :sortBy = 'ratingCount' AND :sortOrder = 'asc' THEN m.ratingCount END ASC,
            CASE WHEN :sortBy = 'ratingCount' AND :sortOrder = 'desc' THEN m.ratingCount END DESC,
            CASE WHEN :sortBy = 'likes' AND :sortOrder = 'asc' THEN m.likes END ASC,
            CASE WHEN :sortBy = 'likes' AND :sortOrder = 'desc' THEN m.likes END DESC,
            CASE WHEN :sortBy = 'reviews' AND :sortOrder = 'asc' THEN m.reviews END ASC,
            CASE WHEN :sortBy = 'reviews' AND :sortOrder = 'desc' THEN m.reviews END DESC,
            CASE WHEN :sortBy = 'comments' AND :sortOrder = 'asc' THEN m.comments END ASC,
            CASE WHEN :sortBy = 'comments' AND :sortOrder = 'desc' THEN m.comments END DESC,
            CASE WHEN :sortBy = 'chapterCount' AND :sortOrder = 'asc' THEN m.totalChapters END ASC,
            CASE WHEN :sortBy = 'chapterCount' AND :sortOrder = 'desc' THEN m.totalChapters END DESC,
            CASE WHEN :sortBy = 'popularity' AND :sortOrder = 'asc' THEN (COALESCE(m.views, 0) + COALESCE(m.comments, 0) + COALESCE(m.likes, 0) + COALESCE(m.reviews, 0)) END ASC,
            CASE WHEN :sortBy = 'popularity' AND :sortOrder = 'desc' THEN (COALESCE(m.views, 0) + COALESCE(m.comments, 0) + COALESCE(m.likes, 0) + COALESCE(m.reviews, 0)) END DESC,
            m.createdAt DESC
    """)
    Page<Manga> findAllWithSorting(
        @Param("sortBy") String sortBy,
        @Param("sortOrder") String sortOrder,
        Pageable pageable
    );

    /**
     * Возвращает все манги, отсортированные по дате создания в убывающем порядке.
     * Сохранено для обратной совместимости.
     *
     * @return список манг
     */
    @Query("SELECT m FROM Manga m ORDER BY m.createdAt DESC")
    List<Manga> findAllOrderByCreatedAtDesc();

    /**
     * Возвращает все манги с пагинацией, отсортированные по дате создания в убывающем порядке.
     * Сохранено для обратной совместимости.
     *
     * @param pageable параметры пагинации
     * @return страница манг
     */
    @Query("SELECT m FROM Manga m ORDER BY m.createdAt DESC")
    Page<Manga> findAllOrderByCreatedAtDesc(Pageable pageable);

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
     * Поиск манги по различным критериям с пагинацией.
     * Использует нативный SQL с явным приведением типов для решения проблем с кодировкой PostgreSQL.
     *
     * @param title название манги (частичное совпадение, игнорируя регистр)
     * @param author автор манги (частичное совпадение, игнорируя регистр)
     * @param genre жанр манги (частичное совпадение, игнорируя регистр)
     * @param status статус манги (точное совпадение)
     * @param pageable параметры пагинации
     * @return страница найденных манг
     */
    @Query(value = """
        SELECT * FROM manga m
        WHERE (:title IS NULL OR UPPER(CAST(m.title AS TEXT)) LIKE UPPER(CONCAT('%', CAST(:title AS TEXT), '%')))
        AND (:author IS NULL OR UPPER(CAST(m.author AS TEXT)) LIKE UPPER(CONCAT('%', CAST(:author AS TEXT), '%')))
        AND (:genre IS NULL OR UPPER(CAST(m.genre AS TEXT)) LIKE UPPER(CONCAT('%', CAST(:genre AS TEXT), '%')))
        AND (:status IS NULL OR m.status = :status)
        ORDER BY
            CASE WHEN :sortBy = 'title' AND :sortOrder = 'asc' THEN m.title END ASC,
            CASE WHEN :sortBy = 'title' AND :sortOrder = 'desc' THEN m.title END DESC,
            CASE WHEN :sortBy = 'author' AND :sortOrder = 'asc' THEN m.author END ASC,
            CASE WHEN :sortBy = 'author' AND :sortOrder = 'desc' THEN m.author END DESC,
            CASE WHEN :sortBy = 'createdAt' AND :sortOrder = 'asc' THEN m.created_at END ASC,
            CASE WHEN :sortBy = 'createdAt' AND :sortOrder = 'desc' THEN m.created_at END DESC,
            CASE WHEN :sortBy = 'updatedAt' AND :sortOrder = 'asc' THEN m.updated_at END ASC,
            CASE WHEN :sortBy = 'updatedAt' AND :sortOrder = 'desc' THEN m.updated_at END DESC,
            CASE WHEN :sortBy = 'views' AND :sortOrder = 'asc' THEN m.views END ASC,
            CASE WHEN :sortBy = 'views' AND :sortOrder = 'desc' THEN m.views END DESC,
            CASE WHEN :sortBy = 'rating' AND :sortOrder = 'asc' THEN m.rating END ASC,
            CASE WHEN :sortBy = 'rating' AND :sortOrder = 'desc' THEN m.rating END DESC,
            CASE WHEN :sortBy = 'ratingCount' AND :sortOrder = 'asc' THEN m.rating_count END ASC,
            CASE WHEN :sortBy = 'ratingCount' AND :sortOrder = 'desc' THEN m.rating_count END DESC,
            CASE WHEN :sortBy = 'likes' AND :sortOrder = 'asc' THEN m.likes END ASC,
            CASE WHEN :sortBy = 'likes' AND :sortOrder = 'desc' THEN m.likes END DESC,
            CASE WHEN :sortBy = 'reviews' AND :sortOrder = 'asc' THEN m.reviews END ASC,
            CASE WHEN :sortBy = 'reviews' AND :sortOrder = 'desc' THEN m.reviews END DESC,
            CASE WHEN :sortBy = 'comments' AND :sortOrder = 'asc' THEN m.comments END ASC,
            CASE WHEN :sortBy = 'comments' AND :sortOrder = 'desc' THEN m.comments END DESC,
            CASE WHEN :sortBy = 'chapterCount' AND :sortOrder = 'asc' THEN m.total_chapters END ASC,
            CASE WHEN :sortBy = 'chapterCount' AND :sortOrder = 'desc' THEN m.total_chapters END DESC,
            CASE WHEN :sortBy = 'popularity' AND :sortOrder = 'asc' THEN (COALESCE(m.views, 0) + COALESCE(m.comments, 0) + COALESCE(m.likes, 0) + COALESCE(m.reviews, 0)) END ASC,
            CASE WHEN :sortBy = 'popularity' AND :sortOrder = 'desc' THEN (COALESCE(m.views, 0) + COALESCE(m.comments, 0) + COALESCE(m.likes, 0) + COALESCE(m.reviews, 0)) END DESC,
            m.created_at DESC
    """, nativeQuery = true)
    Page<Manga> searchMangaPaged(
        @Param("title") String title,
        @Param("author") String author,
        @Param("genre") String genre,
        @Param("status") String status,
        @Param("sortBy") String sortBy,
        @Param("sortOrder") String sortOrder,
        Pageable pageable
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

    /**
     * Поиск манги по различным фильтрам включая жанры, теги, рейтинги и диапазоны.
     * 
     * @param genres список жанров (может быть null или пустой)
     * @param tags список тегов (может быть null или пустой)
     * @param mangaType тип манги (может быть null)
     * @param status статус манги (может быть null)
     * @param ageRatingMin минимальный возрастной рейтинг (может быть null)
     * @param ageRatingMax максимальный возрастной рейтинг (может быть null)
     * @param ratingMin минимальный рейтинг (может быть null)
     * @param ratingMax максимальный рейтинг (может быть null)
     * @param releaseYearMin минимальный год выпуска (может быть null)
     * @param releaseYearMax максимальный год выпуска (может быть null)
     * @param chapterRangeMin минимальное количество глав (может быть null)
     * @param chapterRangeMax максимальное количество глав (может быть null)
     * @param pageable параметры пагинации
     * @return страница найденных манг
     */
    @Query(value = """
        SELECT DISTINCT m.* FROM manga m
        LEFT JOIN manga_genres mg ON m.id = mg.manga_id
        LEFT JOIN genres g ON mg.genre_id = g.id
        LEFT JOIN manga_tags mt ON m.id = mt.manga_id
        LEFT JOIN tags t ON mt.tag_id = t.id
        WHERE (:#{#genres == null ? 0 : #genres.size()} = 0 OR g.name IN :genres)
        AND (:#{#tags == null ? 0 : #tags.size()} = 0 OR t.name IN :tags)
        AND (:mangaType IS NULL OR m.manga_type = :mangaType)
        AND (:status IS NULL OR m.status = :status)
        AND (:ageRatingMin IS NULL OR m.age_limit >= :ageRatingMin)
        AND (:ageRatingMax IS NULL OR m.age_limit <= :ageRatingMax)
        AND (:ratingMin IS NULL OR m.rating >= :ratingMin)
        AND (:ratingMax IS NULL OR m.rating <= :ratingMax)
        AND (:releaseYearMin IS NULL OR EXTRACT(YEAR FROM m.release_date) >= :releaseYearMin)
        AND (:releaseYearMax IS NULL OR EXTRACT(YEAR FROM m.release_date) <= :releaseYearMax)
        AND (:chapterRangeMin IS NULL OR m.total_chapters >= :chapterRangeMin)
        AND (:chapterRangeMax IS NULL OR m.total_chapters <= :chapterRangeMax)
        ORDER BY
            CASE WHEN :sortBy = 'title' AND :sortOrder = 'asc' THEN m.title END ASC,
            CASE WHEN :sortBy = 'title' AND :sortOrder = 'desc' THEN m.title END DESC,
            CASE WHEN :sortBy = 'author' AND :sortOrder = 'asc' THEN m.author END ASC,
            CASE WHEN :sortBy = 'author' AND :sortOrder = 'desc' THEN m.author END DESC,
            CASE WHEN :sortBy = 'createdAt' AND :sortOrder = 'asc' THEN m.created_at END ASC,
            CASE WHEN :sortBy = 'createdAt' AND :sortOrder = 'desc' THEN m.created_at END DESC,
            CASE WHEN :sortBy = 'updatedAt' AND :sortOrder = 'asc' THEN m.updated_at END ASC,
            CASE WHEN :sortBy = 'updatedAt' AND :sortOrder = 'desc' THEN m.updated_at END DESC,
            CASE WHEN :sortBy = 'views' AND :sortOrder = 'asc' THEN m.views END ASC,
            CASE WHEN :sortBy = 'views' AND :sortOrder = 'desc' THEN m.views END DESC,
            CASE WHEN :sortBy = 'rating' AND :sortOrder = 'asc' THEN m.rating END ASC,
            CASE WHEN :sortBy = 'rating' AND :sortOrder = 'desc' THEN m.rating END DESC,
            CASE WHEN :sortBy = 'ratingCount' AND :sortOrder = 'asc' THEN m.rating_count END ASC,
            CASE WHEN :sortBy = 'ratingCount' AND :sortOrder = 'desc' THEN m.rating_count END DESC,
            CASE WHEN :sortBy = 'likes' AND :sortOrder = 'asc' THEN m.likes END ASC,
            CASE WHEN :sortBy = 'likes' AND :sortOrder = 'desc' THEN m.likes END DESC,
            CASE WHEN :sortBy = 'reviews' AND :sortOrder = 'asc' THEN m.reviews END ASC,
            CASE WHEN :sortBy = 'reviews' AND :sortOrder = 'desc' THEN m.reviews END DESC,
            CASE WHEN :sortBy = 'comments' AND :sortOrder = 'asc' THEN m.comments END ASC,
            CASE WHEN :sortBy = 'comments' AND :sortOrder = 'desc' THEN m.comments END DESC,
            CASE WHEN :sortBy = 'chapterCount' AND :sortOrder = 'asc' THEN m.total_chapters END ASC,
            CASE WHEN :sortBy = 'chapterCount' AND :sortOrder = 'desc' THEN m.total_chapters END DESC,
            CASE WHEN :sortBy = 'popularity' AND :sortOrder = 'asc' THEN (COALESCE(m.views, 0) + COALESCE(m.comments, 0) + COALESCE(m.likes, 0) + COALESCE(m.reviews, 0)) END ASC,
            CASE WHEN :sortBy = 'popularity' AND :sortOrder = 'desc' THEN (COALESCE(m.views, 0) + COALESCE(m.comments, 0) + COALESCE(m.likes, 0) + COALESCE(m.reviews, 0)) END DESC,
            m.created_at DESC
        """, 
        countQuery = """
        SELECT COUNT(DISTINCT m.id) FROM manga m
        LEFT JOIN manga_genres mg ON m.id = mg.manga_id
        LEFT JOIN genres g ON mg.genre_id = g.id
        LEFT JOIN manga_tags mt ON m.id = mt.manga_id
        LEFT JOIN tags t ON mt.tag_id = t.id
        WHERE (:#{#genres == null ? 0 : #genres.size()} = 0 OR g.name IN :genres)
        AND (:#{#tags == null ? 0 : #tags.size()} = 0 OR t.name IN :tags)
        AND (:mangaType IS NULL OR m.manga_type = :mangaType)
        AND (:status IS NULL OR m.status = :status)
        AND (:ageRatingMin IS NULL OR m.age_limit >= :ageRatingMin)
        AND (:ageRatingMax IS NULL OR m.age_limit <= :ageRatingMax)
        AND (:ratingMin IS NULL OR m.rating >= :ratingMin)
        AND (:ratingMax IS NULL OR m.rating <= :ratingMax)
        AND (:releaseYearMin IS NULL OR EXTRACT(YEAR FROM m.release_date) >= :releaseYearMin)
        AND (:releaseYearMax IS NULL OR EXTRACT(YEAR FROM m.release_date) <= :releaseYearMax)
        AND (:chapterRangeMin IS NULL OR m.total_chapters >= :chapterRangeMin)
        AND (:chapterRangeMax IS NULL OR m.total_chapters <= :chapterRangeMax)
        """,
        nativeQuery = true)
    Page<Manga> findAllWithFilters(
            @Param("genres") List<String> genres,
            @Param("tags") List<String> tags,
            @Param("mangaType") String mangaType,
            @Param("status") String status,
            @Param("ageRatingMin") Integer ageRatingMin,
            @Param("ageRatingMax") Integer ageRatingMax,
            @Param("ratingMin") Double ratingMin,
            @Param("ratingMax") Double ratingMax,
            @Param("releaseYearMin") Integer releaseYearMin,
            @Param("releaseYearMax") Integer releaseYearMax,
            @Param("chapterRangeMin") Integer chapterRangeMin,
            @Param("chapterRangeMax") Integer chapterRangeMax,
            @Param("sortBy") String sortBy,
            @Param("sortOrder") String sortOrder,
            Pageable pageable
    );
}
