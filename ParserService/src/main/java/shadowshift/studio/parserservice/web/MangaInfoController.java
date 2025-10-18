package shadowshift.studio.parserservice.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import shadowshift.studio.parserservice.config.ParserProperties;
import shadowshift.studio.parserservice.dto.ChapterInfo;
import shadowshift.studio.parserservice.service.MangaLibParserService;

import java.io.IOException;
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
    
    /**
     * Get cover image for manga
     * GET /cover/{slug}
     * 
     * Returns cover from:
     * 1. Cached file in /covers/{slug}.jpg (if exists)
     * 2. Downloads from cover_url in metadata JSON (if cached not found)
     */
    @GetMapping("/cover/{slug}")
    public ResponseEntity<byte[]> getCover(@PathVariable String slug) {
        try {
            logger.info("Cover request: slug={}", slug);
            
            String normalizedSlug = parserService.normalizeSlug(slug);
            
            // Шаг 1: Попытка найти кэшированную обложку
            Path coversDir = Paths.get(properties.getOutputPath(), "covers");
            Files.createDirectories(coversDir); // Создаём директорию если нет
            
            String[] extensions = {".jpg", ".jpeg", ".png", ".webp"};
            Path coverPath = null;
            
            for (String ext : extensions) {
                Path candidate = coversDir.resolve(normalizedSlug + ext);
                if (Files.exists(candidate) && Files.isRegularFile(candidate)) {
                    coverPath = candidate;
                    logger.debug("Найдена кэшированная обложка: {}", coverPath);
                    break;
                }
            }
            
            // Если кэша нет - скачиваем с URL из metadata
            if (coverPath == null) {
                logger.debug("Кэш обложки не найден, читаем metadata для {}", normalizedSlug);
                
                // Читаем JSON с метаданными
                Path titlesDir = Paths.get(properties.getOutputPath(), "titles");
                Path jsonPath = titlesDir.resolve(normalizedSlug + ".json");
                
                if (!Files.exists(jsonPath)) {
                    logger.warn("JSON metadata не найден для {}", normalizedSlug);
                    return ResponseEntity.notFound().build();
                }
                
                Map<String, Object> metadata = objectMapper.readValue(jsonPath.toFile(), Map.class);
                
                // Извлекаем cover_url из covers массива
                List<Map<String, Object>> covers = (List<Map<String, Object>>) metadata.get("covers");
                String coverUrl = null;
                
                if (covers != null && !covers.isEmpty()) {
                    coverUrl = (String) covers.get(0).get("link");
                }
                
                if (coverUrl == null || coverUrl.isEmpty()) {
                    logger.warn("cover_url не найден в metadata для {}", normalizedSlug);
                    return ResponseEntity.notFound().build();
                }
                
                logger.info("Скачивание обложки с URL: {}", coverUrl);
                
                // Скачиваем обложку с правильными заголовками для обхода 403
                RestTemplate restTemplate = new RestTemplate();
                HttpHeaders requestHeaders = new HttpHeaders();
                requestHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
                requestHeaders.set("Referer", "https://mangalib.me/");
                requestHeaders.set("Accept", "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8");
                requestHeaders.set("Accept-Language", "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7");
                requestHeaders.set("Sec-Fetch-Dest", "image");
                requestHeaders.set("Sec-Fetch-Mode", "no-cors");
                requestHeaders.set("Sec-Fetch-Site", "cross-site");
                
                org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(requestHeaders);
                ResponseEntity<byte[]> response = restTemplate.exchange(coverUrl, org.springframework.http.HttpMethod.GET, entity, byte[].class);
                
                if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                    logger.error("Не удалось скачать обложку: HTTP {}", response.getStatusCode());
                    return ResponseEntity.status(response.getStatusCode()).build();
                }
                
                byte[] imageBytes = response.getBody();
                
                // Определяем расширение по Content-Type
                String contentType = response.getHeaders().getContentType() != null 
                    ? response.getHeaders().getContentType().toString() 
                    : "image/jpeg";
                
                String ext = ".jpg";
                if (contentType.contains("png")) {
                    ext = ".png";
                } else if (contentType.contains("webp")) {
                    ext = ".webp";
                }
                
                // Сохраняем в кэш
                coverPath = coversDir.resolve(normalizedSlug + ext);
                Files.write(coverPath, imageBytes);
                logger.info("Обложка скачана и сохранена в кэш: {}", coverPath);
                
                // Возвращаем скачанную обложку
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.parseMediaType(contentType));
                headers.setContentLength(imageBytes.length);
                
                return new ResponseEntity<>(imageBytes, headers, HttpStatus.OK);
            }
            
            // Шаг 2: Возвращаем кэшированную обложку
            byte[] imageBytes = Files.readAllBytes(coverPath);
            
            String contentType = MediaType.IMAGE_JPEG_VALUE;
            String filename = coverPath.getFileName().toString().toLowerCase();
            if (filename.endsWith(".png")) {
                contentType = MediaType.IMAGE_PNG_VALUE;
            } else if (filename.endsWith(".webp")) {
                contentType = "image/webp";
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(contentType));
            headers.setContentLength(imageBytes.length);
            
            logger.info("Отдана кэшированная обложка для {}: {} байт", slug, imageBytes.length);
            return new ResponseEntity<>(imageBytes, headers, HttpStatus.OK);
            
        } catch (IOException e) {
            logger.error("Ошибка обработки обложки для {}: {}", slug, e.getMessage(), e);
            return ResponseEntity.status(500).build();
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
