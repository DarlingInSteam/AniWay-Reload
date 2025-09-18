package shadowshift.studio.mangaservice.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.mangaservice.dto.TagDto;
import shadowshift.studio.mangaservice.entity.Tag;
import shadowshift.studio.mangaservice.service.TagService;

import java.util.List;
import java.util.Optional;

/**
 * REST контроллер для работы с тегами манги.
 * Предоставляет API endpoints для управления тегами.
 *
 * @author ShadowShiftStudio
 */
@RestController
@RequestMapping("/api/tags")
@CrossOrigin(origins = "*")
public class TagController {

    private final TagService tagService;

    /**
     * Конструктор контроллера тегов.
     *
     * @param tagService сервис тегов
     */
    @Autowired
    public TagController(TagService tagService) {
        this.tagService = tagService;
    }

    /**
     * Получает все теги.
     *
     * @return список всех тегов
     */
    @GetMapping
    public ResponseEntity<List<TagDto>> getAllTags() {
        List<Tag> tags = tagService.getAllTags();
        List<TagDto> tagDtos = tags.stream()
                .map(this::convertToDto)
                .toList();
        return ResponseEntity.ok(tagDtos);
    }

    /**
     * Получает активные теги.
     *
     * @return список активных тегов
     */
    @GetMapping("/active")
    public ResponseEntity<List<TagDto>> getActiveTags() {
        List<Tag> tags = tagService.getActiveTags();
        List<TagDto> tagDtos = tags.stream()
                .map(this::convertToDto)
                .toList();
        return ResponseEntity.ok(tagDtos);
    }

    /**
     * Получает активные теги с мангами.
     *
     * @return список активных тегов с мангами
     */
    @GetMapping("/active/with-mangas")
    public ResponseEntity<List<TagDto>> getActiveTagsWithMangas() {
        List<Tag> tags = tagService.getActiveTagsWithMangas();
        List<TagDto> tagDtos = tags.stream()
                .map(this::convertToDto)
                .toList();
        return ResponseEntity.ok(tagDtos);
    }

    /**
     * Получает популярные теги.
     *
     * @param limit количество тегов (по умолчанию 30)
     * @return список популярных тегов
     */
    @GetMapping("/popular")
    public ResponseEntity<List<TagDto>> getPopularTags(
            @RequestParam(defaultValue = "30") int limit) {
        List<Tag> tags = tagService.getPopularTags(limit);
        List<TagDto> tagDtos = tags.stream()
                .map(this::convertToDto)
                .toList();
        return ResponseEntity.ok(tagDtos);
    }

    /**
     * Получает тег по ID.
     *
     * @param id идентификатор тега
     * @return найденный тег или 404
     */
    @GetMapping("/{id}")
    public ResponseEntity<TagDto> getTagById(@PathVariable Long id) {
        Optional<Tag> tag = tagService.getTagById(id);
        return tag.map(t -> ResponseEntity.ok(convertToDto(t)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Получает тег по slug.
     *
     * @param slug slug тега
     * @return найденный тег или 404
     */
    @GetMapping("/slug/{slug}")
    public ResponseEntity<TagDto> getTagBySlug(@PathVariable String slug) {
        Optional<Tag> tag = tagService.getTagBySlug(slug);
        return tag.map(t -> ResponseEntity.ok(convertToDto(t)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Поиск тегов по названию.
     *
     * @param query строка поиска
     * @return список найденных тегов
     */
    @GetMapping("/search")
    public ResponseEntity<List<TagDto>> searchTags(@RequestParam String query) {
        List<Tag> tags = tagService.searchTags(query);
        List<TagDto> tagDtos = tags.stream()
                .map(this::convertToDto)
                .toList();
        return ResponseEntity.ok(tagDtos);
    }

    /**
     * Автодополнение тегов.
     *
     * @param query строка поиска
     * @param limit максимальное количество результатов (по умолчанию 15)
     * @return список тегов для автодополнения
     */
    @GetMapping("/autocomplete")
    public ResponseEntity<List<TagDto>> getTagsForAutocomplete(
            @RequestParam String query,
            @RequestParam(defaultValue = "15") int limit) {
        List<Tag> tags = tagService.getTagsForAutocomplete(query, limit);
        List<TagDto> tagDtos = tags.stream()
                .map(this::convertToDto)
                .toList();
        return ResponseEntity.ok(tagDtos);
    }

    /**
     * Получает теги по цвету.
     *
     * @param color цвет тега
     * @return список тегов с указанным цветом
     */
    @GetMapping("/color/{color}")
    public ResponseEntity<List<TagDto>> getTagsByColor(@PathVariable String color) {
        List<Tag> tags = tagService.getTagsByColor(color);
        List<TagDto> tagDtos = tags.stream()
                .map(this::convertToDto)
                .toList();
        return ResponseEntity.ok(tagDtos);
    }

    /**
     * Получает статистику по тегам.
     *
     * @return статистика тегов
     */
    @GetMapping("/stats")
    public ResponseEntity<TagStats> getTagStats() {
        long totalTags = tagService.getTotalTagsCount();
        long activeTags = tagService.getActiveTagsCount();
        long tagsWithMangas = tagService.getTagsWithMangasCount();
        
        TagStats stats = new TagStats(totalTags, activeTags, tagsWithMangas);
        return ResponseEntity.ok(stats);
    }

    /**
     * Создает новый тег.
     *
     * @param tagDto данные нового тега
     * @return созданный тег
     */
    @PostMapping
    public ResponseEntity<TagDto> createTag(@RequestBody TagDto tagDto) {
        Tag tag = new Tag(tagDto.getName(), tagDto.getDescription(), tagDto.getColor());
        Tag savedTag = tagService.saveTag(tag);
        return ResponseEntity.ok(convertToDto(savedTag));
    }

    /**
     * Обновляет тег.
     *
     * @param id идентификатор тега
     * @param tagDto обновленные данные тега
     * @return обновленный тег или 404
     */
    @PutMapping("/{id}")
    public ResponseEntity<TagDto> updateTag(@PathVariable Long id, @RequestBody TagDto tagDto) {
        try {
            Tag updatedTag = new Tag(tagDto.getName(), tagDto.getDescription(), tagDto.getColor());
            updatedTag.setIsActive(tagDto.getIsActive());
            Tag savedTag = tagService.updateTag(id, updatedTag);
            return ResponseEntity.ok(convertToDto(savedTag));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Деактивирует тег.
     *
     * @param id идентификатор тега
     * @return статус операции
     */
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<TagDto> deactivateTag(@PathVariable Long id) {
        try {
            tagService.deactivateTag(id);
            Optional<Tag> tag = tagService.getTagById(id);
            return tag.map(t -> ResponseEntity.ok(convertToDto(t)))
                    .orElse(ResponseEntity.notFound().build());
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Активирует тег.
     *
     * @param id идентификатор тега
     * @return статус операции
     */
    @PatchMapping("/{id}/activate")
    public ResponseEntity<TagDto> activateTag(@PathVariable Long id) {
        try {
            tagService.activateTag(id);
            Optional<Tag> tag = tagService.getTagById(id);
            return tag.map(t -> ResponseEntity.ok(convertToDto(t)))
                    .orElse(ResponseEntity.notFound().build());
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Удаляет тег.
     *
     * @param id идентификатор тега
     * @return статус операции
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTag(@PathVariable Long id) {
        try {
            tagService.deleteTag(id);
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Конвертирует сущность Tag в DTO.
     *
     * @param tag сущность тега
     * @return DTO тега
     */
    private TagDto convertToDto(Tag tag) {
        return new TagDto(
                tag.getId(),
                tag.getName(),
                tag.getDescription(),
                tag.getSlug(),
                tag.getColor(),
                tag.getMangaCount(),
                tag.getPopularityScore(),
                tag.getIsActive()
        );
    }

    /**
     * Класс для статистики тегов.
     */
    public static class TagStats {
        private final long totalTags;
        private final long activeTags;
        private final long tagsWithMangas;

        public TagStats(long totalTags, long activeTags, long tagsWithMangas) {
            this.totalTags = totalTags;
            this.activeTags = activeTags;
            this.tagsWithMangas = tagsWithMangas;
        }

        public long getTotalTags() { return totalTags; }
        public long getActiveTags() { return activeTags; }
        public long getTagsWithMangas() { return tagsWithMangas; }
    }
}