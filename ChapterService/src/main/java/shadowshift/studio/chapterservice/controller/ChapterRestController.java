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

@RestController
@RequestMapping("/api/chapters")
@CrossOrigin(origins = "*")
public class ChapterRestController {

    @Autowired
    private ChapterService chapterService;

    @GetMapping("/manga/{mangaId}")
    public ResponseEntity<List<ChapterResponseDTO>> getChaptersByMangaId(@PathVariable Long mangaId) {
        List<ChapterResponseDTO> chapters = chapterService.getChaptersByMangaId(mangaId);
        return ResponseEntity.ok(chapters);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChapterResponseDTO> getChapterById(@PathVariable Long id) {
        return chapterService.getChapterById(id)
                .map(chapter -> ResponseEntity.ok(chapter))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/count/{mangaId}")
    public ResponseEntity<Integer> getChapterCountByMangaId(@PathVariable Long mangaId) {
        Integer count = chapterService.getChapterCountByMangaId(mangaId);
        return ResponseEntity.ok(count);
    }

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

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteChapter(@PathVariable Long id) {
        chapterService.deleteChapter(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/manga/{mangaId}/next/{chapterNumber}")
    public ResponseEntity<ChapterResponseDTO> getNextChapter(
            @PathVariable Long mangaId,
            @PathVariable Integer chapterNumber) {
        return chapterService.getNextChapter(mangaId, chapterNumber)
                .map(chapter -> ResponseEntity.ok(chapter))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/manga/{mangaId}/previous/{chapterNumber}")
    public ResponseEntity<ChapterResponseDTO> getPreviousChapter(
            @PathVariable Long mangaId,
            @PathVariable Integer chapterNumber) {
        return chapterService.getPreviousChapter(mangaId, chapterNumber)
                .map(chapter -> ResponseEntity.ok(chapter))
                .orElse(ResponseEntity.notFound().build());
    }
}
