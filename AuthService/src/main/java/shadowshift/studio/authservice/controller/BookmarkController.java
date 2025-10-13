package shadowshift.studio.authservice.controller;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.authservice.dto.BookmarkDTO;
import shadowshift.studio.authservice.entity.BookmarkStatus;
import shadowshift.studio.authservice.service.BookmarkService;

import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Контроллер для управления закладками пользователей в системе.
 * Предоставляет REST API для добавления, обновления, удаления закладок,
 * получения закладок по статусу, избранных и других операций.
 * Поддерживает CORS для указанных origins.
 *
 * @author [Ваше имя или команда, если применимо]
 * @version 1.0
 * @since [Дата или версия релиза]
 */
@RestController
@RequestMapping("/api/bookmarks")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.0.3:3000"})
public class BookmarkController {
    
    private final BookmarkService bookmarkService;
    
    /**
     * Внутренний класс для запроса на добавление или обновление закладки.
     */
    @Data
    static class BookmarkRequest {
        private Long mangaId;
        private BookmarkStatus status;
        private Boolean isFavorite;
    }
    
    /**
     * Добавляет или обновляет закладку для пользователя.
     *
     * @param request объект с данными закладки
     * @param authentication объект аутентификации
     * @return ResponseEntity с BookmarkDTO или ошибкой
     * @throws Exception в случае ошибки добавления/обновления
     */
    @PostMapping
    public ResponseEntity<BookmarkDTO> addOrUpdateBookmark(
            @RequestBody BookmarkRequest request,
            Authentication authentication
    ) {
        try {
            BookmarkDTO bookmark = bookmarkService.addOrUpdateBookmark(
                    authentication.getName(), 
                    request.getMangaId(), 
                    request.getStatus() != null ? request.getStatus() : BookmarkStatus.READING, 
                    request.getIsFavorite()
            );
            return ResponseEntity.ok(bookmark);
        } catch (Exception e) {
            log.error("Add/update bookmark failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Удаляет закладку пользователя для указанной манги.
     *
     * @param mangaId идентификатор манги
     * @param authentication объект аутентификации
     * @return ResponseEntity с подтверждением или ошибкой
     * @throws Exception в случае ошибки удаления
     */
    @DeleteMapping("/{mangaId}")
    public ResponseEntity<Void> removeBookmark(
            @PathVariable Long mangaId,
            Authentication authentication
    ) {
        try {
            bookmarkService.removeBookmark(authentication.getName(), mangaId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Remove bookmark failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Удаляет все закладки для указанной манги (административная операция).
     *
     * @param mangaId идентификатор манги
     * @return ResponseEntity с подтверждением или ошибкой
     * @throws Exception в случае ошибки удаления
     */
    @DeleteMapping("/manga/{mangaId}")
    public ResponseEntity<Void> removeAllBookmarksForManga(@PathVariable Long mangaId) {
        try {
            bookmarkService.removeAllBookmarksForManga(mangaId);
            log.info("All bookmarks removed for manga ID: {}", mangaId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Remove all bookmarks for manga failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Очищает осиротевшие закладки (административная операция).
     *
     * @return ResponseEntity с результатом операции или ошибкой
     * @throws Exception в случае ошибки очистки
     */
    @DeleteMapping("/cleanup-orphaned")
    public ResponseEntity<Map<String, Object>> cleanupOrphanedBookmarks() {
        try {
            Map<String, Object> result = bookmarkService.cleanupOrphanedBookmarks();
            log.info("Cleanup orphaned bookmarks completed: {}", result);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Cleanup orphaned bookmarks failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Возвращает количество пользователей, у которых данная манга находится в закладках.
     */
    @GetMapping("/manga/{mangaId}/subscribers/count")
    public ResponseEntity<Map<String, Long>> getMangaBookmarkSubscriberCount(@PathVariable Long mangaId) {
        try {
            long count = bookmarkService.getSubscriberCountByManga(mangaId);
            return ResponseEntity.ok(Map.of("count", count));
        } catch (Exception e) {
            log.error("Get bookmark subscriber count failed: {}", e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Получает все закладки текущего пользователя.
     *
     * @param authentication объект аутентификации
     * @return ResponseEntity со списком BookmarkDTO или ошибкой
     * @throws Exception в случае ошибки получения данных
     */
    @GetMapping
    public ResponseEntity<List<BookmarkDTO>> getUserBookmarks(Authentication authentication) {
        try {
            List<BookmarkDTO> bookmarks = bookmarkService.getUserBookmarks(authentication.getName());
            return ResponseEntity.ok(bookmarks);
        } catch (Exception e) {
            log.error("Get user bookmarks failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Получает закладки пользователя по статусу.
     *
     * @param status статус закладки
     * @param authentication объект аутентификации
     * @return ResponseEntity со списком BookmarkDTO или ошибкой
     * @throws Exception в случае ошибки получения данных
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<List<BookmarkDTO>> getUserBookmarksByStatus(
            @PathVariable BookmarkStatus status,
            Authentication authentication
    ) {
        try {
            List<BookmarkDTO> bookmarks = bookmarkService.getUserBookmarksByStatus(
                    authentication.getName(), status
            );
            return ResponseEntity.ok(bookmarks);
        } catch (Exception e) {
            log.error("Get user bookmarks by status failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Получает избранные закладки пользователя.
     *
     * @param authentication объект аутентификации
     * @return ResponseEntity со списком BookmarkDTO или ошибкой
     * @throws Exception в случае ошибки получения данных
     */
    @GetMapping("/favorites")
    public ResponseEntity<List<BookmarkDTO>> getUserFavorites(Authentication authentication) {
        try {
            List<BookmarkDTO> favorites = bookmarkService.getUserFavorites(authentication.getName());
            return ResponseEntity.ok(favorites);
        } catch (Exception e) {
            log.error("Get user favorites failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Получает закладку пользователя для указанной манги.
     *
     * @param mangaId идентификатор манги
     * @param authentication объект аутентификации
     * @return ResponseEntity с BookmarkDTO или 404, если не найдено, или ошибкой
     * @throws Exception в случае ошибки получения данных
     */
    @GetMapping("/manga/{mangaId}")
    public ResponseEntity<BookmarkDTO> getUserBookmarkForManga(
            @PathVariable Long mangaId,
            Authentication authentication
    ) {
        try {
            Optional<BookmarkDTO> bookmark = bookmarkService.getUserBookmarkForManga(
                    authentication.getName(), mangaId
            );
            return bookmark.map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            log.error("Get user bookmark for manga failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Получает публичные закладки пользователя по имени.
     *
     * @param username имя пользователя
     * @return ResponseEntity со списком BookmarkDTO или ошибкой
     * @throws Exception в случае ошибки получения данных
     */
    @GetMapping("/user/{username}")
    public ResponseEntity<List<BookmarkDTO>> getPublicBookmarks(@PathVariable String username) {
        try {
            List<BookmarkDTO> bookmarks = bookmarkService.getUserBookmarks(username);
            return ResponseEntity.ok(bookmarks);
        } catch (Exception e) {
            log.error("Get public bookmarks failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Расширенный поиск закладок текущего пользователя с фильтрацией и сортировкой.
     */
    @GetMapping("/search")
    public ResponseEntity<List<BookmarkDTO>> searchUserBookmarks(
            Authentication authentication,
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "status", required = false) BookmarkStatus status,
            @RequestParam(value = "favorite", required = false) Boolean favorite,
            @RequestParam(value = "sortBy", required = false) String sortBy,
            @RequestParam(value = "sortOrder", required = false) String sortOrder
    ) {
        try {
            List<BookmarkDTO> bookmarks = bookmarkService.searchUserBookmarks(
                    authentication.getName(), query, status, favorite, sortBy, sortOrder
            );
            return ResponseEntity.ok(bookmarks);
        } catch (Exception e) {
            log.error("Search bookmarks failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Административная операция: массовое заполнение кэша метаданных манги в закладках.
     */
    @PostMapping("/backfill-cache")
    public ResponseEntity<Map<String,Object>> backfillCache() {
        try {
            var result = bookmarkService.backfillMangaCache();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Backfill cache failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}
