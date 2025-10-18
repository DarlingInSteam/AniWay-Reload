package shadowshift.studio.parserservice.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.parserservice.config.ParserProperties;
import shadowshift.studio.parserservice.dto.ChapterInfo;
import shadowshift.studio.parserservice.service.MangaLibParserService;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Collectors;
import java.util.concurrent.CompletableFuture;

/**
 * Legacy manga-info endpoint for MangaService compatibility
 */
@RestController
@RequestMapping("/manga-info")
public class MangaInfoController {
    
    private static final Logger logger = LoggerFactory.getLogger(MangaInfoController.class);
    
    @Autowired
    private MangaLibParserService parserService;
    
    @Autowired
    private ParserProperties properties;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    /**
     * Get chapters only (legacy endpoint for MangaService)
     * GET /manga-info/{slug}/chapters-only?parser=mangalib&include_slides_count=true
     */
    @GetMapping("/{slug}/chapters-only")
    public ResponseEntity<Map<String, Object>> getChaptersOnly(
            @PathVariable String slug,
            @RequestParam(required = false, defaultValue = "mangalib") String parser,
            @RequestParam(required = false, defaultValue = "false") boolean include_slides_count) {
        
        try {
            logger.info("Chapters-only request: slug={}, parser={}, includeSlidesCount={}", 
                slug, parser, include_slides_count);
            
            // Normalize slug
            String normalizedSlug = parserService.normalizeSlug(slug);
            
            // Try to read from cached JSON first (в директории titles/)
            Path jsonPath = Paths.get(properties.getOutputPath(), "titles", normalizedSlug + ".json");
            
            List<ChapterInfo> chapters;
            
            if (Files.exists(jsonPath)) {
                logger.debug("Reading chapters from cached file: {}", jsonPath);
                Map<String, Object> cached = objectMapper.readValue(jsonPath.toFile(), Map.class);
                chapters = parseChaptersFromCache(cached);
            } else {
                logger.debug("Fetching fresh chapters for slug: {}", normalizedSlug);
                
                // Parse manga to get chapters
                CompletableFuture<shadowshift.studio.parserservice.dto.ParseResult> parseFuture = 
                    parserService.parseManga(normalizedSlug, "mangalib");
                shadowshift.studio.parserservice.dto.ParseResult parseResult = parseFuture.join();
                
                if (parseResult != null && parseResult.getChapters() != null) {
                    chapters = parseResult.getChapters();
                } else {
                    logger.warn("No chapters found for slug: {}", normalizedSlug);
                    chapters = Collections.emptyList();
                }
            }
            
            // Convert to legacy format
            Map<String, Object> response = new HashMap<>();
            List<Map<String, Object>> chaptersList = new ArrayList<>();
            
            for (ChapterInfo chapter : chapters) {
                Map<String, Object> chapterMap = new HashMap<>();
                chapterMap.put("id", chapter.getChapterId());
                chapterMap.put("number", chapter.getNumber());
                chapterMap.put("volume", chapter.getVolume());
                chapterMap.put("title", chapter.getTitle());
                chapterMap.put("is_paid", chapter.getIsPaid());
                
                // Include slides_count if requested (set to null for now, can be fetched if needed)
                if (include_slides_count) {
                    chapterMap.put("slides_count", null);  // TODO: fetch actual count from MangaLib
                }
                
                chaptersList.add(chapterMap);
            }
            
            response.put("success", true);
            response.put("total_chapters", chaptersList.size());
            response.put("chapters", chaptersList);
            logger.info("Returned {} chapters for slug: {}", chaptersList.size(), normalizedSlug);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error fetching chapters for slug {}: {}", slug, e.getMessage(), e);
            
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            error.put("chapters", Collections.emptyList());
            
            return ResponseEntity.status(500).body(error);
        }
    }
    
    /**
     * Get full manga info (legacy endpoint)
     * GET /manga-info/{slug}
     */
    @GetMapping("/{slug}")
    public ResponseEntity<Map<String, Object>> getMangaInfo(@PathVariable String slug) {
        try {
            logger.info("Manga-info request: slug={}", slug);

            String normalizedSlug = parserService.normalizeSlug(slug);
            Path outputDir = Paths.get(properties.getOutputPath());
            Path titlesDir = outputDir.resolve("titles");

            List<Path> candidatePaths = new ArrayList<>();
            candidatePaths.add(titlesDir.resolve(normalizedSlug + ".json"));
            candidatePaths.add(outputDir.resolve(normalizedSlug + ".json")); // legacy location

            if (!normalizedSlug.equals(slug)) {
                // Запасной вариант: используем исходный slug как есть
                candidatePaths.add(titlesDir.resolve(slug + ".json"));
                candidatePaths.add(outputDir.resolve(slug + ".json"));
            }

            for (Path candidate : candidatePaths) {
                if (Files.exists(candidate) && Files.isRegularFile(candidate)) {
                    logger.debug("Чтение manga-info из файла: {}", candidate);
                    Map<String, Object> mangaInfo = objectMapper.readValue(candidate.toFile(), Map.class);
                    return ResponseEntity.ok(mangaInfo);
                }
            }

            Map<String, Object> error = new HashMap<>();
            error.put("error", "Manga not found: " + normalizedSlug);
            error.put("attempted_paths", candidatePaths.stream().map(Path::toString).collect(Collectors.toList()));
            return ResponseEntity.status(404).body(error);

        } catch (Exception e) {
            logger.error("Error reading manga info for {}: {}", slug, e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    @SuppressWarnings("unchecked")
    private List<ChapterInfo> parseChaptersFromCache(Map<String, Object> cached) {
        List<ChapterInfo> chapters = new ArrayList<>();
        
        Object chaptersObj = cached.get("chapters");
        if (chaptersObj instanceof List) {
            List<Map<String, Object>> chapterMaps = (List<Map<String, Object>>) chaptersObj;
            for (Map<String, Object> chMap : chapterMaps) {
                ChapterInfo chapter = new ChapterInfo();
                chapter.setChapterId(String.valueOf(chMap.get("id")));
                chapter.setNumber(((Number) chMap.getOrDefault("number", 0)).doubleValue());
                chapter.setVolume(chMap.get("volume") != null ? ((Number) chMap.get("volume")).intValue() : null);
                chapter.setTitle((String) chMap.get("title"));
                chapter.setIsPaid((Boolean) chMap.getOrDefault("is_paid", false));
                chapters.add(chapter);
            }
        }
        
        return chapters;
    }
}
