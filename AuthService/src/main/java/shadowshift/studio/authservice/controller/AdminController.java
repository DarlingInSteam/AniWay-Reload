package shadowshift.studio.authservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.authservice.service.BookmarkService;

import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.0.3:3000"})
public class AdminController {
    
    private final BookmarkService bookmarkService;
    
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
