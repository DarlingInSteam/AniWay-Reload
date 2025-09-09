package shadowshift.studio.authservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.authservice.dto.ReadingProgressDTO;
import shadowshift.studio.authservice.service.ReadingProgressService;

import java.util.List;

@RestController
@RequestMapping("/auth/users")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.0.3:3000"})
public class PublicProgressController {

    private final ReadingProgressService readingProgressService;

    /**
     * Публичный endpoint для получения прогресса чтения пользователя по его userId.
     * GET /auth/users/{userId}/public/progress
     */
    @GetMapping("/{userId}/public/progress")
    public ResponseEntity<List<ReadingProgressDTO>> getPublicUserProgress(@PathVariable Long userId) {
        try {
            List<ReadingProgressDTO> progress = readingProgressService.getUserProgressById(userId);
            return ResponseEntity.ok(progress);
        } catch (IllegalArgumentException e) {
            log.warn("Public get user progress failed: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Public get user progress failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Публичный endpoint для получения прогресса чтения конкретной манги у пользователя.
     * GET /auth/users/{userId}/public/manga/{mangaId}/progress
     */
    @GetMapping("/{userId}/public/manga/{mangaId}/progress")
    public ResponseEntity<List<ReadingProgressDTO>> getPublicMangaProgress(
            @PathVariable Long userId,
            @PathVariable Long mangaId
    ) {
        try {
            List<ReadingProgressDTO> progress = readingProgressService.getMangaProgressByUserId(userId, mangaId);
            return ResponseEntity.ok(progress);
        } catch (IllegalArgumentException e) {
            log.warn("Public get manga progress failed: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            log.error("Public get manga progress failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}
