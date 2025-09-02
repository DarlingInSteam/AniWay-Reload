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

@Data
class BookmarkRequest {
    private Long mangaId;
    private BookmarkStatus status;
    private Boolean isFavorite;
}

@RestController
@RequestMapping("/api/bookmarks")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.0.3:3000"})
public class BookmarkController {
    
    private final BookmarkService bookmarkService;
    
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
}
