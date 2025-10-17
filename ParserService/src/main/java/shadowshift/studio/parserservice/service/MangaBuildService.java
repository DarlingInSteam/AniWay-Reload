package shadowshift.studio.parserservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import shadowshift.studio.parserservice.config.ParserProperties;
import shadowshift.studio.parserservice.domain.task.ParserTask;
import shadowshift.studio.parserservice.domain.task.TaskStatus;
import shadowshift.studio.parserservice.dto.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Сервис для сборки манги (download изображений глав)
 */
@Service
public class MangaBuildService {

    private static final Logger logger = LoggerFactory.getLogger(MangaBuildService.class);
    
    private static final String MANGALIB_API_BASE = "https://api.cdnlibs.org/api";
    
    @Autowired
    private ParserProperties properties;
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private TaskStorageService taskStorage;
    
    @Autowired
    private ImageDownloadService imageDownloader;
    
    @Autowired
    private TaskService taskService;
    
    /**
     * Получает список URL изображений главы
     */
    private List<String> fetchChapterImages(String slug, ChapterInfo chapter) throws IOException {
        // Use the same API endpoint pattern as MangaLib parser: /manga/{slug}/chapter?number={number}&volume={volume}
        StringBuilder urlBuilder = new StringBuilder(MANGALIB_API_BASE + "/manga/" + slug + "/chapter");
        
        List<String> queryParams = new ArrayList<>();
        if (chapter.getNumber() != null) {
            queryParams.add("number=" + chapter.getNumber());
        }
        if (chapter.getVolume() != null) {
            queryParams.add("volume=" + chapter.getVolume());
        }
        
        if (!queryParams.isEmpty()) {
            urlBuilder.append("?").append(String.join("&", queryParams));
        }
        
        String url = urlBuilder.toString();
        
        HttpHeaders headers = createMangaLibHeaders();
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        try {
            logger.debug("Fetching chapter images from: {}", url);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new IOException("Failed to fetch chapter data: " + response.getStatusCode());
            }
            
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode data = root.get("data");
            
            if (data == null) {
                throw new IOException("No 'data' field in response");
            }
            
            JsonNode pages = data.get("pages");
            
            if (pages == null || !pages.isArray()) {
                throw new IOException("No 'pages' array in response data");
            }
            
            // Get image server from response
            String server = data.has("server") ? data.get("server").asText() : "";
            
            List<String> imageUrls = new ArrayList<>();
            
            for (JsonNode page : pages) {
                String relativeUrl = page.get("url").asText();
                // Combine server + relative URL
                String fullUrl = server + relativeUrl.replace(" ", "%20");
                imageUrls.add(fullUrl);
            }
            
            logger.debug("Fetched {} image URLs for chapter {} volume {}", 
                imageUrls.size(), chapter.getNumber(), chapter.getVolume());
            return imageUrls;
            
        } catch (Exception e) {
            logger.error("Error fetching chapter images for {}/ch{}: {}", slug, chapter.getNumber(), e.getMessage());
            throw new IOException("Failed to fetch chapter images: " + e.getMessage(), e);
        }
    }
    
    /**
     * Создает заголовки для запросов к MangaLib API
     */
    private HttpHeaders createMangaLibHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");
        headers.set("Site-Id", "1");
        
        // TODO: Get token from properties/config
        String token = System.getenv("MANGALIB_TOKEN");
        if (token != null && !token.isEmpty()) {
            headers.set("Authorization", "Bearer " + token);
        }
        
        return headers;
    }
    
    /**
     * Нормализация slug для безопасного использования.
     * ВАЖНО: API MangaLib требует полный slug в формате "id--slug", поэтому НЕ обрезаем ID!
     */
    private String normalizeSlug(String slug) {
        if (slug == null || slug.isEmpty()) {
            return slug;
        }
        
        // API требует полный slug_url в формате "id--slug", поэтому просто возвращаем как есть
        return slug;
    }
    
    /**
     * Выполняет билд манги для ParserTask
     */
    public void buildManga(ParserTask task) {
        long startTime = System.currentTimeMillis();
        String slug = task.getSlugs().get(0);
        
        try {
            task.setMessage("Loading manga metadata...");
            task.setProgress(5);
            
            // Normalize slug
            String normalizedSlug = normalizeSlug(slug);
            
            // Load JSON with metadata (must exist after parse)
            Path jsonPath = Paths.get(properties.getOutputPath(), "titles", normalizedSlug + ".json");
            if (!Files.exists(jsonPath)) {
                throw new IOException("Metadata not found at: " + jsonPath + ". Run parse first for " + normalizedSlug);
            }
            
            // Read metadata
            JsonNode rootNode = objectMapper.readTree(jsonPath.toFile());
            JsonNode chaptersNode = rootNode.get("chapters");
            
            if (chaptersNode == null || !chaptersNode.isArray()) {
                throw new IOException("Invalid metadata format: missing or invalid 'chapters' array");
            }
            
            List<ChapterInfo> chapters = new ArrayList<>();
            for (JsonNode chNode : chaptersNode) {
                ChapterInfo chapter = objectMapper.treeToValue(chNode, ChapterInfo.class);
                chapters.add(chapter);
            }
            
            task.setMessage(String.format("Found %d chapters to download", chapters.size()));
            task.setProgress(10);
            taskService.appendLog(task, String.format("📋 Loaded metadata: %d chapters from %s", chapters.size(), jsonPath));
            
            // Create images directory
            Path imagesDir = Paths.get(properties.getOutputPath(), "images", normalizedSlug);
            Files.createDirectories(imagesDir);
            taskService.appendLog(task, String.format("📁 Created images directory: %s", imagesDir));
            
            // Download images for each chapter
            int chapterIndex = 0;
            int totalImages = 0;
            int downloadedImages = 0;
            int skippedChapters = 0;
            
            for (ChapterInfo chapter : chapters) {
                chapterIndex++;
                
                if (chapter.getIsPaid() != null && chapter.getIsPaid()) {
                    skippedChapters++;
                    taskService.appendLog(task, String.format("⏭️ [%d/%d] Skipping paid chapter %.1f", 
                        chapterIndex, chapters.size(), chapter.getNumber()));
                    continue;
                }
                
                task.setMessage(String.format("Downloading chapter %d/%d (%.1f)", 
                    chapterIndex, chapters.size(), chapter.getNumber()));
                taskService.appendLog(task, String.format("📥 [%d/%d] Downloading chapter %.1f: %s", 
                    chapterIndex, chapters.size(), chapter.getNumber(), 
                    chapter.getTitle() != null ? chapter.getTitle() : ""));
                
                try {
                    // Get chapter image URLs
                    List<String> imageUrls = fetchChapterImages(normalizedSlug, chapter);
                    
                    if (imageUrls.isEmpty()) {
                        taskService.appendLog(task, String.format("   ⚠️ Chapter %.1f: no images found", chapter.getNumber()));
                        continue;
                    }
                    
                    // Create chapter directory
                    String chapterDirName = String.format("ch_%.1f", chapter.getNumber()).replace(",", ".");
                    Path chapterDir = imagesDir.resolve(chapterDirName);
                    Files.createDirectories(chapterDir);
                    
                    // Prepare download tasks
                    List<ImageDownloadService.ImageDownloadTask> downloadTasks = new ArrayList<>();
                    for (int i = 0; i < imageUrls.size(); i++) {
                        String imageUrl = imageUrls.get(i);
                        String imageName = String.format("%03d.jpg", i + 1);
                        Path imagePath = chapterDir.resolve(imageName);
                        downloadTasks.add(new ImageDownloadService.ImageDownloadTask(imageUrl, imagePath));
                    }
                    
                    totalImages += imageUrls.size();
                    
                    // Download images in parallel
                    long chapterStartTime = System.currentTimeMillis();
                    ImageDownloadService.DownloadSummary summary = imageDownloader.downloadImages(downloadTasks).join();
                    long chapterElapsed = System.currentTimeMillis() - chapterStartTime;
                    
                    downloadedImages += summary.successCount;
                    
                    double speedMBps = summary.totalTime > 0 ? 
                        (summary.totalBytes / 1024.0 / 1024.0) / (summary.totalTime / 1000.0) : 0;
                    double speedImgps = summary.totalTime > 0 ? 
                        (summary.totalImages * 1000.0) / summary.totalTime : 0;
                    
                    taskService.appendLog(task, String.format("   ✅ Downloaded %d/%d images (%.2f MB/s, %.1f img/s, %dms)", 
                        summary.successCount, imageUrls.size(), speedMBps, speedImgps, chapterElapsed));
                    
                    int progress = 10 + (chapterIndex * 85 / chapters.size());
                    task.setProgress(progress);
                    task.setMessage(String.format("Processed %d/%d chapters", chapterIndex, chapters.size()));
                    
                } catch (Exception e) {
                    taskService.appendLog(task, String.format("   ❌ Error downloading chapter %.1f: %s", 
                        chapter.getNumber(), e.getMessage()));
                    logger.error("Error downloading chapter {}: {}", chapter.getNumber(), e.getMessage(), e);
                }
            }
            
            long totalElapsed = System.currentTimeMillis() - startTime;
            
            task.setStatus(TaskStatus.COMPLETED);
            task.setCompletedAt(Instant.now());
            task.setProgress(100);
            task.setMessage(String.format("Build completed: %d images from %d chapters (skipped %d paid) in %dms", 
                downloadedImages, chapterIndex - skippedChapters, skippedChapters, totalElapsed));
            taskService.appendLog(task, String.format("🎉 Build completed: %d/%d images downloaded, %d chapters processed, %d skipped, time: %dms", 
                downloadedImages, totalImages, chapterIndex - skippedChapters, skippedChapters, totalElapsed));
            
        } catch (Exception e) {
            long totalElapsed = System.currentTimeMillis() - startTime;
            logger.error("Build error for {}: {}", slug, e.getMessage(), e);
            
            task.setStatus(TaskStatus.FAILED);
            task.setCompletedAt(Instant.now());
            task.setMessage("Build failed: " + e.getMessage());
            taskService.appendLog(task, String.format("❌ Build failed after %dms: %s", totalElapsed, e.getMessage()));
        }
    }
}
