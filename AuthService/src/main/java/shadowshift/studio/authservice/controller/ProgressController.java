package shadowshift.studio.authservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.authservice.dto.ReadingProgressDTO;
import shadowshift.studio.authservice.service.ReadingProgressService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth/progress")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.0.3:3000"})
public class ProgressController {
    
    private final ReadingProgressService readingProgressService;
    
    @GetMapping
    public ResponseEntity<List<ReadingProgressDTO>> getUserProgress(Authentication authentication) {
        try {
            List<ReadingProgressDTO> progress = readingProgressService.getUserProgress(authentication.getName());
            return ResponseEntity.ok(progress);
        } catch (Exception e) {
            log.error("Get user progress failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/manga/{mangaId}")
    public ResponseEntity<List<ReadingProgressDTO>> getMangaProgress(
            @PathVariable Long mangaId,
            Authentication authentication
    ) {
        try {
            List<ReadingProgressDTO> progress = readingProgressService.getMangaProgress(authentication.getName(), mangaId);
            return ResponseEntity.ok(progress);
        } catch (Exception e) {
            log.error("Get manga progress failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/chapter/{chapterId}")
    public ResponseEntity<ReadingProgressDTO> getChapterProgress(
            @PathVariable Long chapterId,
            Authentication authentication
    ) {
        try {
            ReadingProgressDTO progress = readingProgressService.getChapterProgress(authentication.getName(), chapterId);
            if (progress == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(progress);
        } catch (Exception e) {
            log.error("Get chapter progress failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PostMapping
    public ResponseEntity<ReadingProgressDTO> saveProgress(
            @RequestBody ReadingProgressDTO progressData,
            Authentication authentication
    ) {
        try {
            ReadingProgressDTO progress = readingProgressService.saveProgress(authentication.getName(), progressData);
            return ResponseEntity.ok(progress);
        } catch (Exception e) {
            log.error("Save progress failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<ReadingProgressDTO> updateProgress(
            @PathVariable Long id,
            @RequestBody ReadingProgressDTO progressData,
            Authentication authentication
    ) {
        try {
            ReadingProgressDTO progress = readingProgressService.updateProgress(authentication.getName(), id, progressData);
            return ResponseEntity.ok(progress);
        } catch (Exception e) {
            log.error("Update progress failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProgress(
            @PathVariable Long id,
            Authentication authentication
    ) {
        try {
            readingProgressService.deleteProgress(authentication.getName(), id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Delete progress failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getReadingStats(Authentication authentication) {
        try {
            Map<String, Object> stats = readingProgressService.getReadingStats(authentication.getName());
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            log.error("Get reading stats failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}
