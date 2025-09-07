package shadowshift.studio.imagestorageservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.imagestorageservice.entity.ChapterImage;

import java.util.List;
import java.util.Optional;

/**
 * Репозиторий для работы с изображениями глав манги.
 * Предоставляет методы для выполнения CRUD операций и кастомных запросов
 * к изображениям глав, включая работу с обложками манги.
 *
 * @author ShadowShiftStudio
 */
@Repository
public interface ChapterImageRepository extends JpaRepository<ChapterImage, Long> {

    /**
     * Найти все изображения для указанной главы, отсортированные по номеру страницы.
     *
     * @param chapterId идентификатор главы
     * @return список изображений главы, отсортированный по возрастанию номера страницы
     */
    List<ChapterImage> findByChapterIdOrderByPageNumberAsc(Long chapterId);

    /**
     * Найти изображение по идентификатору главы и номеру страницы.
     *
     * @param chapterId идентификатор главы
     * @param pageNumber номер страницы
     * @return Optional с изображением или пустой Optional если изображение не найдено
     */
    Optional<ChapterImage> findByChapterIdAndPageNumber(Long chapterId, Integer pageNumber);

    /**
     * Подсчитать количество изображений в указанной главе.
     *
     * @param chapterId идентификатор главы
     * @return количество изображений в главе
     */
    Integer countByChapterId(Long chapterId);

    /**
     * Удалить все изображения для указанной главы.
     *
     * @param chapterId идентификатор главы
     */
    @Modifying
    @Transactional
    void deleteByChapterId(Long chapterId);

    /**
     * Найти максимальный номер страницы для указанной главы.
     *
     * @param chapterId идентификатор главы
     * @return Optional с максимальным номером страницы или Optional.empty() если глав нет
     */
    @Query("SELECT COALESCE(MAX(ci.pageNumber), 0) FROM ChapterImage ci WHERE ci.chapterId = :chapterId")
    Optional<Integer> findMaxPageNumberByChapterId(@Param("chapterId") Long chapterId);

    /**
     * Найти все обложки манги (изображения с chapterId = -1).
     *
     * @return список всех обложек манги
     */
    @Query("SELECT ci FROM ChapterImage ci WHERE ci.chapterId = -1")
    List<ChapterImage> findAllCovers();

    /**
     * Найти обложку манги по номеру страницы.
     *
     * @param pageNumber номер страницы обложки
     * @return Optional с обложкой или пустой Optional если обложка не найдена
     */
    @Query("SELECT ci FROM ChapterImage ci WHERE ci.chapterId = -1 AND ci.pageNumber = :pageNumber")
    Optional<ChapterImage> findCoverByPageNumber(@Param("pageNumber") Integer pageNumber);

    /**
     * Найти изображение по идентификаторам манги и главы.
     *
     * @param mangaId идентификатор манги
     * @param chapterId идентификатор главы
     * @return Optional с изображением или пустой Optional если изображение не найдено
     */
    Optional<ChapterImage> findByMangaIdAndChapterId(Long mangaId, Long chapterId);
}
