package shadowshift.studio.mangaservice.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import shadowshift.studio.mangaservice.entity.Tag;

import java.util.List;
import java.util.Optional;

/**
 * Репозиторий для работы с сущностью Tag.
 * Обеспечивает доступ к данным тегов манги.
 *
 * @author ShadowShiftStudio
 */
@Repository
public interface TagRepository extends JpaRepository<Tag, Long> {

    /**
     * Находит тег по названию.
     *
     * @param name название тега
     * @return Optional с найденным тегом
     */
    Optional<Tag> findByName(String name);

    /**
     * Находит тег по slug.
     *
     * @param slug slug тега
     * @return Optional с найденным тегом
     */
    Optional<Tag> findBySlug(String slug);

    /**
     * Находит теги по названию, содержащему указанный текст (регистронезависимо).
     *
     * @param name текст для поиска в названии
     * @return список найденных тегов
     */
    List<Tag> findByNameContainingIgnoreCase(String name);

    /**
     * Находит все активные теги.
     *
     * @return список активных тегов
     */
    List<Tag> findByIsActiveTrueOrderByNameAsc();

    /**
     * Находит топ N популярных тегов по рейтингу популярности.
     *
     * @param pageable параметры пагинации
     * @return страница тегов, отсортированных по популярности
     */
    @Query("SELECT t FROM Tag t WHERE t.isActive = true ORDER BY t.popularityScore DESC, t.mangaCount DESC")
    Page<Tag> findTopByPopularity(Pageable pageable);

    /**
     * Находит все теги, отсортированные по названию.
     *
     * @return список всех тегов
     */
    List<Tag> findAllByOrderByNameAsc();

    /**
     * Находит все активные теги, у которых есть манги.
     *
     * @return список тегов с мангами
     */
    @Query("SELECT t FROM Tag t WHERE t.isActive = true AND t.mangaCount > 0 ORDER BY t.name ASC")
    List<Tag> findActiveTagsWithMangas();

    /**
     * Находит теги по списку ID.
     *
     * @param ids список идентификаторов тегов
     * @return список найденных тегов
     */
    List<Tag> findByIdIn(List<Long> ids);

    /**
     * Находит теги по списку названий.
     *
     * @param names список названий тегов
     * @return список найденных тегов
     */
    List<Tag> findByNameIn(List<String> names);

    /**
     * Проверяет существование тега по названию.
     *
     * @param name название тега
     * @return true если тег существует
     */
    boolean existsByName(String name);

    /**
     * Проверяет существование тега по slug.
     *
     * @param slug slug тега
     * @return true если тег существует
     */
    boolean existsBySlug(String slug);

    /**
     * Получает количество всех тегов.
     *
     * @return общее количество тегов
     */
    @Query("SELECT COUNT(t) FROM Tag t")
    long countAllTags();

    /**
     * Получает количество активных тегов.
     *
     * @return количество активных тегов
     */
    @Query("SELECT COUNT(t) FROM Tag t WHERE t.isActive = true")
    long countActiveTags();

    /**
     * Получает количество тегов с мангами.
     *
     * @return количество тегов с мангами
     */
    @Query("SELECT COUNT(t) FROM Tag t WHERE t.mangaCount > 0")
    long countTagsWithMangas();

    /**
     * Находит популярные теги с количеством манг больше указанного.
     *
     * @param minMangaCount минимальное количество манг
     * @return список популярных тегов
     */
    @Query("SELECT t FROM Tag t WHERE t.isActive = true AND t.mangaCount >= :minMangaCount ORDER BY t.popularityScore DESC, t.mangaCount DESC")
    List<Tag> findPopularTags(@Param("minMangaCount") Integer minMangaCount);

    /**
     * Поиск тегов для автодополнения.
     *
     * @param query строка поиска
     * @param pageable параметры пагинации
     * @return страница тегов для автодополнения
     */
    @Query("SELECT t FROM Tag t WHERE t.isActive = true AND LOWER(t.name) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY t.popularityScore DESC, t.mangaCount DESC, t.name ASC")
    Page<Tag> findForAutocomplete(@Param("query") String query, Pageable pageable);

    /**
     * Находит теги по цвету.
     *
     * @param color цвет тега
     * @return список тегов с указанным цветом
     */
    List<Tag> findByColor(String color);

    /**
     * Находит теги с рейтингом популярности больше указанного.
     *
     * @param minPopularityScore минимальный рейтинг популярности
     * @return список тегов
     */
    @Query("SELECT t FROM Tag t WHERE t.popularityScore >= :minPopularityScore ORDER BY t.popularityScore DESC")
    List<Tag> findByPopularityScoreGreaterThanEqual(@Param("minPopularityScore") Integer minPopularityScore);
}