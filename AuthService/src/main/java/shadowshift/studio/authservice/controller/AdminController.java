package shadowshift.studio.authservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.authservice.service.BookmarkService;

import java.util.Map;

/**
 * Контроллер для административных операций в системе аутентификации.
 * Предоставляет REST API для управления закладками, включая очистку
 * осиротевших закладок и удаление всех закладок для конкретной манги.
 * Поддерживает CORS для указанных origins.
 *
 * @author [Ваше имя или команда, если применимо]
 * @version 1.0
 * @since [Дата или версия релиза]
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.0.3:3000"})
public class AdminController {
    
    private final BookmarkService bookmarkService;
    
    /**
     * Очищает осиротевшие закладки (закладки без связанных пользователей или манги).
     *
     * @return ResponseEntity с результатом операции (Map с деталями) или ошибкой
     * @throws Exception в случае ошибки при выполнении очистки
     */
    @DeleteMapping("/bookmarks/cleanup-orphaned")
    public ResponseEntity<Map<String, Object>> cleanupOrphanedBookmarks() {
        try {
            Map<String, Object> result = bookmarkService.cleanupOrphanedBookmarks();
            log.info("Admin cleanup orphaned bookmarks completed: {}", result);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Admin cleanup orphaned bookmarks failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Удаляет все закладки для указанной манги.
     *
     * @param mangaId идентификатор манги
     * @return ResponseEntity с подтверждением успешного удаления или ошибкой
     * @throws Exception в случае ошибки при удалении закладок
     */
    @DeleteMapping("/bookmarks/manga/{mangaId}")
    public ResponseEntity<Void> removeAllBookmarksForManga(@PathVariable Long mangaId) {
        try {
            bookmarkService.removeAllBookmarksForManga(mangaId);
            log.info("Admin removed all bookmarks for manga ID: {}", mangaId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Admin remove all bookmarks for manga failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}
