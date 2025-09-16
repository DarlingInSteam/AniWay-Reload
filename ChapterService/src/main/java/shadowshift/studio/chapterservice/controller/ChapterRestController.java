package shadowshift.studio.chapterservice.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.chapterservice.dto.ChapterCreateDTO;
import shadowshift.studio.chapterservice.dto.ChapterResponseDTO;
import shadowshift.studio.chapterservice.service.ChapterService;
import java.util.List;
import java.util.Map;

/**
 * REST контроллер для управления главами манги.
 * Предоставляет полный набор CRUD операций для работы с главами,
 * включая получение, создание, обновление и удаление глав.
 *
 * @author ShadowShiftStudio
 */
@RestController
@RequestMapping("/api/chapters")
@CrossOrigin(origins = "*")
public class ChapterRestController {

    @Autowired
    private ChapterService chapterService;

    /**
     * Получает список всех глав для указанной манги.
     *
     * @param mangaId идентификатор манги
     * @return список глав манги
     */
    @GetMapping("/manga/{mangaId}")
    public ResponseEntity<List<ChapterResponseDTO>> getChaptersByMangaId(@PathVariable Long mangaId) {
        List<ChapterResponseDTO> chapters = chapterService.getChaptersByMangaId(mangaId);
        return ResponseEntity.ok(chapters);
    }

    /**
     * Получает главу по ее идентификатору.
     *
     * @param id идентификатор главы
     * @return информация о главе или 404, если глава не найдена
     */
    @GetMapping("/{id}")
    public ResponseEntity<ChapterResponseDTO> getChapterById(@PathVariable Long id) {
        return chapterService.getChapterById(id)
                .map(chapter -> ResponseEntity.ok(chapter))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Получает количество глав для указанной манги.
     *
     * @param mangaId идентификатор манги
     * @return количество глав
     */
    @GetMapping("/count/{mangaId}")
    public ResponseEntity<Integer> getChapterCountByMangaId(@PathVariable Long mangaId) {
        Integer count = chapterService.getChapterCountByMangaId(mangaId);
        return ResponseEntity.ok(count);
    }

    /**
     * Создает новую главу.
     *
     * @param createDTO данные для создания главы
     * @return созданная глава или ошибка валидации
     */
    @PostMapping
    public ResponseEntity<?> createChapter(@Valid @RequestBody ChapterCreateDTO createDTO) {
        try {
            ChapterResponseDTO createdChapter = chapterService.createChapter(createDTO);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdChapter);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Chapter creation failed",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Обновляет существующую главу.
     *
     * @param id идентификатор обновляемой главы
     * @param updateDTO новые данные главы
     * @return обновленная глава или ошибка валидации
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateChapter(
            @PathVariable Long id,
            @Valid @RequestBody ChapterCreateDTO updateDTO) {
        try {
            return chapterService.updateChapter(id, updateDTO)
                    .map(chapter -> ResponseEntity.ok((Object)chapter))
                    .orElse(ResponseEntity.notFound().build());
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Chapter update failed",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Удаляет главу по ее идентификатору.
     *
     * @param id идентификатор удаляемой главы
     * @return статус успешного удаления
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChapter(@PathVariable Long id) {
        chapterService.deleteChapter(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Получает следующую главу после указанной.
     *
     * @param mangaId идентификатор манги
     * @param chapterNumber номер текущей главы
     * @return следующая глава или 404, если следующей главы нет
     */
    @GetMapping("/manga/{mangaId}/next/{chapterNumber}")
    public ResponseEntity<ChapterResponseDTO> getNextChapter(
            @PathVariable Long mangaId,
            @PathVariable Double chapterNumber) {
        return chapterService.getNextChapter(mangaId, chapterNumber)
                .map(chapter -> ResponseEntity.ok(chapter))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Получает предыдущую главу перед указанной.
     *
     * @param mangaId идентификатор манги
     * @param chapterNumber номер текущей главы
     * @return предыдущая глава или 404, если предыдущей главы нет
     */
    @GetMapping("/manga/{mangaId}/previous/{chapterNumber}")
    public ResponseEntity<ChapterResponseDTO> getPreviousChapter(
            @PathVariable Long mangaId,
            @PathVariable Double chapterNumber) {
        return chapterService.getPreviousChapter(mangaId, chapterNumber)
                .map(chapter -> ResponseEntity.ok(chapter))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Обновляет количество страниц в главе.
     *
     * @param id идентификатор главы
     * @param request объект с полем pageCount
     * @return обновленная глава или ошибка валидации
     */
    @PutMapping("/{id}/pagecount")
    public ResponseEntity<?> updateChapterPageCount(
            @PathVariable Long id,
            @RequestBody Map<String, Object> request) {
        try {
            Integer pageCount = (Integer) request.get("pageCount");
            if (pageCount == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", "pageCount is required"
                ));
            }

            ChapterResponseDTO updatedChapter = chapterService.updatePageCount(id, pageCount);
            return ResponseEntity.ok(updatedChapter);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to update pageCount",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Поставить лайк к главе от имени пользователя.
     *
     * @param id идентификатор главы
     * @param userId идентификатор пользователя (из заголовка)
     * @return статус успешного лайка
     */
    @PostMapping("/{id}/like")
    public ResponseEntity<?> likeChapter(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        try {
            chapterService.likeChapter(userId, id);
            return ResponseEntity.ok(Map.of("message", "Chapter liked successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to like chapter",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Убрать лайк с главы от имени пользователя.
     *
     * @param id идентификатор главы
     * @param userId идентификатор пользователя (из заголовка)
     * @return статус успешного снятия лайка
     */
    @DeleteMapping("/{id}/like")
    public ResponseEntity<?> unlikeChapter(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        try {
            chapterService.unlikeChapter(userId, id);
            return ResponseEntity.ok(Map.of("message", "Chapter unliked successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to unlike chapter",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Переключить лайк к главе от имени пользователя (автоматически определить поставить или убрать).
     *
     * @param id идентификатор главы
     * @param userId идентификатор пользователя (из заголовка)
     * @return статус успешного переключения лайка с информацией о действии
     */
    @PostMapping("/{id}/toggle-like")
    public ResponseEntity<?> toggleLike(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        try {
            Map<String, Object> result = chapterService.toggleLike(userId, id);
            return ResponseEntity.ok(Map.of(
                "message", (Boolean) result.get("liked") ? "Chapter liked successfully" : "Chapter unliked successfully",
                "liked", result.get("liked"),
                "likeCount", result.get("likeCount")
            ));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Failed to toggle chapter like",
                "message", e.getMessage()
            ));
        }
    }

    /**
     * Проверить, лайкнул ли пользователь главу.
     *
     * @param id идентификатор главы
     * @param userId идентификатор пользователя (из заголовка)
     * @return true, если пользователь лайкнул главу, иначе false
     */
    @GetMapping("/{id}/like")
    public ResponseEntity<Map<String, Boolean>> isLikedByUser(
            @PathVariable Long id,
            @RequestHeader("X-User-Id") Long userId) {
        boolean isLiked = chapterService.isLikedByUser(userId, id);
        return ResponseEntity.ok(Map.of("liked", isLiked));
    }
}
