package shadowshift.studio.mangaservice.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.mangaservice.entity.Tag;
import shadowshift.studio.mangaservice.repository.TagRepository;

import java.util.List;
import java.util.Optional;

/**
 * Сервис для работы с тегами манги.
 * Предоставляет бизнес-логику для управления тегами.
 *
 * @author ShadowShiftStudio
 */
@Service
@Transactional
public class TagService {

    private final TagRepository tagRepository;

    /**
     * Конструктор сервиса тегов.
     *
     * @param tagRepository репозиторий тегов
     */
    @Autowired
    public TagService(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    /**
     * Получает все теги.
     *
     * @return список всех тегов
     */
    @Transactional(readOnly = true)
    public List<Tag> getAllTags() {
        return tagRepository.findAllByOrderByNameAsc();
    }

    /**
     * Получает все активные теги.
     *
     * @return список активных тегов
     */
    @Transactional(readOnly = true)
    public List<Tag> getActiveTags() {
        return tagRepository.findByIsActiveTrueOrderByNameAsc();
    }

    /**
     * Получает активные теги с мангами.
     *
     * @return список активных тегов с мангами
     */
    @Transactional(readOnly = true)
    public List<Tag> getActiveTagsWithMangas() {
        return tagRepository.findActiveTagsWithMangas();
    }

    /**
     * Получает тег по ID.
     *
     * @param id идентификатор тега
     * @return Optional с найденным тегом
     */
    @Transactional(readOnly = true)
    public Optional<Tag> getTagById(Long id) {
        return tagRepository.findById(id);
    }

    /**
     * Получает тег по названию.
     *
     * @param name название тега
     * @return Optional с найденным тегом
     */
    @Transactional(readOnly = true)
    public Optional<Tag> getTagByName(String name) {
        return tagRepository.findByName(name);
    }

    /**
     * Получает тег по slug.
     *
     * @param slug slug тега
     * @return Optional с найденным тегом
     */
    @Transactional(readOnly = true)
    public Optional<Tag> getTagBySlug(String slug) {
        return tagRepository.findBySlug(slug);
    }

    /**
     * Поиск тегов по названию.
     *
     * @param query строка поиска
     * @return список найденных тегов
     */
    @Transactional(readOnly = true)
    public List<Tag> searchTags(String query) {
        return tagRepository.findByNameContainingIgnoreCase(query);
    }

    /**
     * Получает популярные теги.
     *
     * @param limit количество тегов
     * @return список популярных тегов
     */
    @Transactional(readOnly = true)
    public List<Tag> getPopularTags(int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        Page<Tag> page = tagRepository.findTopByPopularity(pageable);
        return page.getContent();
    }

    /**
     * Получает теги для автодополнения.
     *
     * @param query строка поиска
     * @param limit максимальное количество результатов
     * @return список тегов для автодополнения
     */
    @Transactional(readOnly = true)
    public List<Tag> getTagsForAutocomplete(String query, int limit) {
        Pageable pageable = PageRequest.of(0, limit);
        Page<Tag> page = tagRepository.findForAutocomplete(query, pageable);
        return page.getContent();
    }

    /**
     * Создает новый тег или возвращает существующий.
     *
     * @param name название тега
     * @return созданный или найденный тег
     */
    public Tag createOrGetTag(String name) {
        return tagRepository.findByName(name)
                .orElseGet(() -> {
                    Tag newTag = new Tag(name);
                    return tagRepository.save(newTag);
                });
    }

    /**
     * Создает новый тег с описанием или возвращает существующий.
     *
     * @param name название тега
     * @param description описание тега
     * @return созданный или найденный тег
     */
    public Tag createOrGetTag(String name, String description) {
        return tagRepository.findByName(name)
                .orElseGet(() -> {
                    Tag newTag = new Tag(name, description);
                    return tagRepository.save(newTag);
                });
    }

    /**
     * Создает новый тег с полными данными или возвращает существующий.
     *
     * @param name название тега
     * @param description описание тега
     * @param color цвет тега
     * @return созданный или найденный тег
     */
    public Tag createOrGetTag(String name, String description, String color) {
        return tagRepository.findByName(name)
                .orElseGet(() -> {
                    Tag newTag = new Tag(name, description, color);
                    return tagRepository.save(newTag);
                });
    }

    /**
     * Создает несколько тегов из списка названий.
     *
     * @param tagNames список названий тегов
     * @return список созданных/найденных тегов
     */
    public List<Tag> createOrGetTags(List<String> tagNames) {
        return tagNames.stream()
                .distinct()
                .map(this::createOrGetTag)
                .toList();
    }

    /**
     * Сохраняет тег.
     *
     * @param tag тег для сохранения
     * @return сохраненный тег
     */
    public Tag saveTag(Tag tag) {
        return tagRepository.save(tag);
    }

    /**
     * Обновляет тег.
     *
     * @param id идентификатор тега
     * @param updatedTag обновленные данные тега
     * @return обновленный тег
     * @throws RuntimeException если тег не найден
     */
    public Tag updateTag(Long id, Tag updatedTag) {
        Tag existingTag = tagRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tag not found with id: " + id));

        existingTag.setName(updatedTag.getName());
        existingTag.setDescription(updatedTag.getDescription());
        existingTag.setColor(updatedTag.getColor());
        existingTag.setIsActive(updatedTag.getIsActive());

        return tagRepository.save(existingTag);
    }

    /**
     * Деактивирует тег.
     *
     * @param id идентификатор тега
     * @throws RuntimeException если тег не найден
     */
    public void deactivateTag(Long id) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tag not found with id: " + id));
        tag.setIsActive(false);
        tagRepository.save(tag);
    }

    /**
     * Активирует тег.
     *
     * @param id идентификатор тега
     * @throws RuntimeException если тег не найден
     */
    public void activateTag(Long id) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Tag not found with id: " + id));
        tag.setIsActive(true);
        tagRepository.save(tag);
    }

    /**
     * Удаляет тег по ID.
     *
     * @param id идентификатор тега
     * @throws RuntimeException если тег не найден
     */
    public void deleteTag(Long id) {
        if (!tagRepository.existsById(id)) {
            throw new RuntimeException("Tag not found with id: " + id);
        }
        tagRepository.deleteById(id);
    }

    /**
     * Проверяет существование тега по названию.
     *
     * @param name название тега
     * @return true если тег существует
     */
    @Transactional(readOnly = true)
    public boolean existsByName(String name) {
        return tagRepository.existsByName(name);
    }

    /**
     * Получает количество всех тегов.
     *
     * @return общее количество тегов
     */
    @Transactional(readOnly = true)
    public long getTotalTagsCount() {
        return tagRepository.countAllTags();
    }

    /**
     * Получает количество активных тегов.
     *
     * @return количество активных тегов
     */
    @Transactional(readOnly = true)
    public long getActiveTagsCount() {
        return tagRepository.countActiveTags();
    }

    /**
     * Получает количество тегов с мангами.
     *
     * @return количество тегов с мангами
     */
    @Transactional(readOnly = true)
    public long getTagsWithMangasCount() {
        return tagRepository.countTagsWithMangas();
    }

    /**
     * Получает теги по списку ID.
     *
     * @param ids список идентификаторов
     * @return список найденных тегов
     */
    @Transactional(readOnly = true)
    public List<Tag> getTagsByIds(List<Long> ids) {
        return tagRepository.findByIdIn(ids);
    }

    /**
     * Получает популярные теги с минимальным количеством манг.
     *
     * @param minMangaCount минимальное количество манг
     * @return список популярных тегов
     */
    @Transactional(readOnly = true)
    public List<Tag> getPopularTags(Integer minMangaCount) {
        return tagRepository.findPopularTags(minMangaCount);
    }

    /**
     * Получает теги по цвету.
     *
     * @param color цвет тега
     * @return список тегов с указанным цветом
     */
    @Transactional(readOnly = true)
    public List<Tag> getTagsByColor(String color) {
        return tagRepository.findByColor(color);
    }
}