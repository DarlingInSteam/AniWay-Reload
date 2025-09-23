package shadowshift.studio.mangaservice.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.mangaservice.entity.Genre;

import java.util.List;
import java.util.Optional;

/**
 * Репозиторий для работы с сущностью Genre.
 * Обеспечивает доступ к данным жанров манги.
 *
 * @author ShadowShiftStudio
 */
@Repository
public interface GenreRepository extends JpaRepository<Genre, Long> {

    /**
     * Находит жанр по названию.
     *
     * @param name название жанра
     * @return Optional с найденным жанром
     */
    Optional<Genre> findByName(String name);

    /**
     * Находит жанр по slug.
     *
     * @param slug slug жанра
     * @return Optional с найденным жанром
     */
    Optional<Genre> findBySlug(String slug);

    /**
     * Находит жанры по названию, содержащему указанный текст (регистронезависимо).
     *
     * @param name текст для поиска в названии
     * @return список найденных жанров
     */
    List<Genre> findByNameContainingIgnoreCase(String name);

    /**
     * Находит топ N популярных жанров по количеству манг.
     *
     * @param pageable параметры пагинации
     * @return страница жанров, отсортированных по популярности
     */
    @Query("SELECT g FROM Genre g ORDER BY g.mangaCount DESC")
    Page<Genre> findTopByMangaCount(Pageable pageable);

    /**
     * Находит все жанры, отсортированные по названию.
     *
     * @return список всех жанров
     */
    List<Genre> findAllByOrderByNameAsc();

    /**
     * Находит все жанры, у которых есть манги.
     *
     * @return список жанров с мангами
     */
    @Query("SELECT g FROM Genre g WHERE g.mangaCount > 0 ORDER BY g.name ASC")
    List<Genre> findGenresWithMangas();

    /**
     * Находит жанры по списку ID.
     *
     * @param ids список идентификаторов жанров
     * @return список найденных жанров
     */
    List<Genre> findByIdIn(List<Long> ids);

    /**
     * Находит жанры по списку названий.
     *
     * @param names список названий жанров
     * @return список найденных жанров
     */
    List<Genre> findByNameIn(List<String> names);

    /**
     * Проверяет существование жанра по названию.
     *
     * @param name название жанра
     * @return true если жанр существует
     */
    boolean existsByName(String name);

    /**
     * Проверяет существование жанра по slug.
     *
     * @param slug slug жанра
     * @return true если жанр существует
     */
    boolean existsBySlug(String slug);

    /**
     * Получает количество всех жанров.
     *
     * @return общее количество жанров
     */
    @Query("SELECT COUNT(g) FROM Genre g")
    long countAllGenres();

    /**
     * Получает количество активных жанров (с мангами).
     *
     * @return количество активных жанров
     */
    @Query("SELECT COUNT(g) FROM Genre g WHERE g.mangaCount > 0")
    long countActiveGenres();

    /**
     * Находит жанры с количеством манг больше указанного.
     *
     * @param minMangaCount минимальное количество манг
     * @return список популярных жанров
     */
    @Query("SELECT g FROM Genre g WHERE g.mangaCount >= :minMangaCount ORDER BY g.mangaCount DESC")
    List<Genre> findPopularGenres(@Param("minMangaCount") Integer minMangaCount);

    /**
     * Поиск жанров для автодополнения.
     *
     * @param query строка поиска
     * @param pageable параметры пагинации
     * @return страница жанров для автодополнения
     */
    @Query("SELECT g FROM Genre g WHERE LOWER(g.name) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY g.mangaCount DESC, g.name ASC")
    Page<Genre> findForAutocomplete(@Param("query") String query, Pageable pageable);
}