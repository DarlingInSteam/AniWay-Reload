package shadowshift.studio.parserservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import shadowshift.studio.parserservice.config.ParserProperties;
import shadowshift.studio.parserservice.domain.task.ParserTask;
import shadowshift.studio.parserservice.domain.task.TaskStatus;
import shadowshift.studio.parserservice.dto.*;
import shadowshift.studio.parserservice.util.MangaLibApiHelper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

/**
 * Сервис для сборки манги (download изображений глав)
 */
@Service
public class MangaBuildService {

    private static final Logger logger = LoggerFactory.getLogger(MangaBuildService.class);

    private static final String MANGALIB_API_BASE = "https://api.cdnlibs.org/api";
    private static final String CONSTANTS_ENDPOINT = MANGALIB_API_BASE + "/constants?fields[]=imageServers";
    private static final int MAX_CHAPTER_REQUEST_ATTEMPTS = 3;
    private static final long INITIAL_RETRY_DELAY_MS = 2_000L;
    private static final double RETRY_BACKOFF_FACTOR = 2.0;
    private static final double RETRY_JITTER_MIN = 0.85;
    private static final double RETRY_JITTER_MAX = 1.25;
    private static final long MAX_RETRY_DELAY_MS = 45_000L;
    
    @Autowired
    private ParserProperties properties;
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private ImageDownloadService imageDownloader;
    
    @Autowired
    private TaskService taskService;

    private volatile String cachedImageServer;
    
    /**
     * Получает список слайдов главы, обращаясь к MangaLib API.
     */
    private List<SlideInfo> fetchChapterSlides(String apiSlug, ChapterInfo chapter, int defaultBranchId) throws IOException {
        List<String> urlVariants = MangaLibApiHelper.buildChapterUrlVariants(
                MANGALIB_API_BASE,
                apiSlug,
                chapter.getChapterId(),
                chapter.getNumber(),
                chapter.getVolume(),
                chapter.getBranchId(),
                defaultBranchId > 0 ? defaultBranchId : null
        );

        if (urlVariants.isEmpty()) {
            throw new IOException("Не удалось сформировать запрос для главы " + chapter.getChapterId());
        }

        HttpHeaders headers = createMangaLibHeaders();
        String imageServer = resolveImageServer();
        String lastError = null;

        for (String url : urlVariants) {
            for (int attempt = 0; attempt < MAX_CHAPTER_REQUEST_ATTEMPTS; attempt++) {
                try {
                    ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, new HttpEntity<>(headers), String.class);
                    JsonNode root = objectMapper.readTree(response.getBody());
                    JsonNode pages = root.has("pages") ? root.get("pages") : root.path("data").path("pages");
                    if (!pages.isArray() || pages.isEmpty()) {
                        lastError = "источник не вернул страницы";
                        break;
                    }
                    return parseSlides(pages, imageServer);
                } catch (HttpStatusCodeException ex) {
                    int statusCode = ex.getStatusCode().value();
                    lastError = "HTTP " + statusCode + formatOptionalMessage(ex);
                    if (!MangaLibApiHelper.isRetryableStatus(statusCode)
                            || attempt == MAX_CHAPTER_REQUEST_ATTEMPTS - 1) {
                        break;
                    }
                    safeSleep(computeRetryDelay(attempt));
                } catch (RestClientException | IOException ex) {
                    lastError = ex.getMessage();
                    if (attempt == MAX_CHAPTER_REQUEST_ATTEMPTS - 1) {
                        break;
                    }
                    safeSleep(computeRetryDelay(attempt));
                }
            }
        }

        throw new IOException(lastError != null ? lastError : "источник не вернул страницы");
    }

    private long computeRetryDelay(int attempt) {
        double base = INITIAL_RETRY_DELAY_MS * Math.pow(RETRY_BACKOFF_FACTOR, attempt);
        double jitter = ThreadLocalRandom.current().nextDouble(RETRY_JITTER_MIN, RETRY_JITTER_MAX);
        long delay = (long) (base * jitter);
        return Math.min(delay, MAX_RETRY_DELAY_MS);
    }

    private void safeSleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
        }
    }

    private String resolveImageServer() throws IOException {
        String cached = cachedImageServer;
        if (cached != null) {
            return cached;
        }
        synchronized (this) {
            if (cachedImageServer != null) {
                return cachedImageServer;
            }
            HttpHeaders headers = createMangaLibHeaders();
            try {
                ResponseEntity<String> response = restTemplate.exchange(CONSTANTS_ENDPOINT, HttpMethod.GET, new HttpEntity<>(headers), String.class);
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode servers = root.path("data").path("imageServers");
                if (!servers.isArray() || servers.isEmpty()) {
                    throw new IOException("Список серверов изображений пуст");
                }

                String preferredId = Optional.ofNullable(properties.getMangalib().getServer()).orElse("main");
                Integer siteId = parseIntegerSafe(properties.getMangalib().getSiteId());

                String fallback = null;
                for (JsonNode serverNode : servers) {
                    String id = serverNode.path("id").asText("");
                    String url = serverNode.path("url").asText("");
                    if (url.isBlank()) {
                        continue;
                    }
                    boolean supportsSite = siteId == null || serverNode.path("site_ids").toString().contains(String.valueOf(siteId));
                    if (!supportsSite) {
                        continue;
                    }
                    url = ensureTrailingSlash(url);
                    if (id.equals(preferredId)) {
                        cachedImageServer = url;
                        return cachedImageServer;
                    }
                    if (fallback == null) {
                        fallback = url;
                    }
                }
                if (fallback != null) {
                    cachedImageServer = fallback;
                    return cachedImageServer;
                }
                throw new IOException("Не найден подходящий сервер изображений");
            } catch (HttpStatusCodeException ex) {
                throw new IOException("Не удалось получить конфигурацию серверов изображений: HTTP "
                        + ex.getStatusCode().value() + formatOptionalMessage(ex), ex);
            } catch (RestClientException ex) {
                throw new IOException("Ошибка запроса серверов изображений: " + ex.getMessage(), ex);
            }
        }
    }

    private String ensureTrailingSlash(String url) {
        return url.endsWith("/") ? url : url + "/";
    }

    private String formatOptionalMessage(HttpStatusCodeException ex) {
        String body = ex.getResponseBodyAsString();
        if (body == null || body.isBlank()) {
            return "";
        }
        try {
            JsonNode node = objectMapper.readTree(body);
            if (node.isObject()) {
                for (String key : List.of("message", "error", "detail", "reason")) {
                    JsonNode value = node.get(key);
                    if (value != null && value.isTextual() && !value.asText().isBlank()) {
                        return " - " + value.asText();
                    }
                }
            }
        } catch (Exception ignored) {
            // ignore
        }
        return body.length() > 120 ? " - " + body.substring(0, 120) : " - " + body;
    }

    private List<SlideInfo> parseSlides(JsonNode pages, String imageServer) {
        List<SlideInfo> slides = new ArrayList<>();
        int index = 1;
        for (JsonNode page : pages) {
            String relative = page.path("url").asText(null);
            if (relative == null || relative.isBlank()) {
                continue;
            }
            String sanitized = relative.replace(" ", "%20");
            String link;
            if (sanitized.startsWith("http://") || sanitized.startsWith("https://")) {
                link = sanitized;
            } else {
                while (sanitized.startsWith("/")) {
                    sanitized = sanitized.substring(1);
                }
                link = imageServer + sanitized;
            }
            Integer width = page.hasNonNull("width") ? page.get("width").asInt() : null;
            Integer height = page.hasNonNull("height") ? page.get("height").asInt() : null;
            slides.add(new SlideInfo(index++, link, width, height));
        }
        return slides;
    }

    private Integer parseIntegerSafe(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException ex) {
            return null;
        }
    }
    
    /**
     * Создает заголовки для запросов к MangaLib API
     */
    private HttpHeaders createMangaLibHeaders() {
        HttpHeaders headers = new HttpHeaders();
        String token = MangaLibApiHelper.normalizeToken(properties.getMangalib().getToken());
        if (token != null) {
            headers.set("Authorization", token);
        }
        headers.set("Site-Id", properties.getMangalib().getSiteId());
        headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
        headers.set("Accept", "application/json, text/plain, */*");
        headers.set("Accept-Language", "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7");
        headers.set("Accept-Encoding", "gzip, deflate, br");
        headers.set("Origin", "https://" + properties.getMangalib().getSiteDomain());
        headers.set("Referer", properties.getMangalib().getReferer());
        headers.set("Sec-Fetch-Dest", "empty");
        headers.set("Sec-Fetch-Mode", "cors");
        headers.set("Sec-Fetch-Site", "cross-site");
        headers.set("Sec-CH-UA", "\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"");
        headers.set("Sec-CH-UA-Mobile", "?0");
        headers.set("Sec-CH-UA-Platform", "\"Windows\"");
        return headers;
    }
    
    /**
     * Находит JSON файл манги, поддерживая оба формата slug (с ID и без)
     */
    private Path findMangaJsonPath(SlugContext slugContext) throws IOException {
        Path titlesDir = Paths.get(properties.getOutputPath(), "titles");
        if (!Files.exists(titlesDir)) {
            return null;
        }

        Set<String> candidates = new LinkedHashSet<>();
        if (slugContext != null) {
            candidates.add(slugContext.getFileSlug());
            candidates.add(slugContext.getApiSlug());
            candidates.add(slugContext.getRawSlug());
        }

        for (String candidate : candidates) {
            if (candidate == null || candidate.isBlank()) {
                continue;
            }
            Path directPath = titlesDir.resolve(candidate + ".json");
            if (Files.exists(directPath)) {
                return directPath;
            }

            if (candidate.contains("--")) {
                String slugWithoutId = candidate.substring(candidate.indexOf("--") + 2);
                if (!slugWithoutId.isBlank()) {
                    Path withoutIdPath = titlesDir.resolve(slugWithoutId + ".json");
                    if (Files.exists(withoutIdPath)) {
                        return withoutIdPath;
                    }
                }
            }
        }

        String fileSlug = slugContext != null ? slugContext.getFileSlug() : null;
        if (fileSlug != null && !fileSlug.isBlank()) {
            try (var stream = Files.list(titlesDir)) {
                return stream
                        .filter(p -> p.getFileName().toString().endsWith("--" + fileSlug + ".json"))
                        .findFirst()
                        .orElse(null);
            }
        }

        return null;
    }

    private Integer extractTitleId(JsonNode rootNode) {
        if (rootNode == null || !rootNode.isObject()) {
            return null;
        }
        JsonNode idNode = rootNode.get("id");
        if (idNode != null && idNode.isInt()) {
            return idNode.asInt();
        }
        JsonNode metadataNode = rootNode.get("metadata");
        if (metadataNode != null && metadataNode.hasNonNull("id")) {
            return metadataNode.get("id").asInt();
        }
        return null;
    }

    private SlugContext resolveSlugContext(String raw) {
        if (raw == null || raw.isBlank()) {
            return new SlugContext("", "", "", null, false);
        }
        String trimmed = raw.trim();
        if (trimmed.contains("--")) {
            String[] parts = trimmed.split("--", 2);
            if (parts.length == 2 && parts[0].chars().allMatch(Character::isDigit)) {
                Integer id = parseIntegerSafe(parts[0]);
                String fileSlug = parts[1].isBlank() ? parts[1] : parts[1];
                return new SlugContext(trimmed, trimmed, fileSlug, id, true);
            }
        }
        String normalized = trimmed.replace('/', '-');
        return new SlugContext(trimmed, normalized, normalized, null, false);
    }
    
    /**
     * Выполняет билд манги для ParserTask
     */
    public void buildManga(ParserTask task) {
        long startTime = System.currentTimeMillis();
        String slug = task.getSlugs().get(0);
        SlugContext slugContext = resolveSlugContext(slug);
        
        try {
            task.setMessage("Loading manga metadata...");
            task.setProgress(5);

            // Load JSON with metadata (must exist after parse)
            // Try to find JSON file - it might have ID prefix or not
            Path jsonPath = findMangaJsonPath(slugContext);
            if (jsonPath == null || !Files.exists(jsonPath)) {
                throw new IOException("Metadata not found for slug: " + slugContext.getFileSlug() + 
                    ". Run parse first. Checked paths: " + 
                    properties.getOutputPath() + "/titles/" + slugContext.getFileSlug() + ".json and variants");
            }
            
            logger.info("📂 Found JSON metadata at: {}", jsonPath);
            
            // Read metadata
            JsonNode rootNode = objectMapper.readTree(jsonPath.toFile());
            JsonNode chaptersNode = rootNode.get("chapters");

            Integer titleId = extractTitleId(rootNode);
            slugContext.applyId(titleId);
            int defaultBranchId = slugContext.getDefaultBranchId();
            
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
            
            // Extract actual slug from JSON filename for consistent directory structure
            String jsonFileName = jsonPath.getFileName().toString();
            String actualSlug = jsonFileName.substring(0, jsonFileName.length() - 5); // Remove ".json"
            
            // Create images directory using the actual slug from JSON
            Path imagesDir = Paths.get(properties.getOutputPath(), "images", actualSlug);
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
                    List<SlideInfo> slides = chapter.getSlides();
                    if (slides == null || slides.isEmpty()) {
                        slides = fetchChapterSlides(slugContext.getApiSlug(), chapter, defaultBranchId);
                        chapter.setSlides(slides);
                        logger.debug("Fetched {} slides from API for chapter {}", slides.size(), chapter.getNumber());
                    } else {
                        logger.debug("Using {} slides from cached JSON for chapter {}", slides.size(), chapter.getNumber());
                    }

                    List<SlideInfo> downloadableSlides = slides.stream()
                            .filter(Objects::nonNull)
                            .filter(slide -> slide.getLink() != null && !slide.getLink().isBlank())
                            .collect(Collectors.toList());

                    if (downloadableSlides.isEmpty()) {
                        taskService.appendLog(task, String.format("   ⚠️ Chapter %.1f: no images found", chapter.getNumber()));
                        continue;
                    }
                    
                    // Create chapter directory
                    String chapterDirName = String.format("ch_%.1f", chapter.getNumber()).replace(",", ".");
                    Path chapterDir = imagesDir.resolve(chapterDirName);
                    Files.createDirectories(chapterDir);
                    
                    // Prepare download tasks
                    List<ImageDownloadService.ImageDownloadTask> downloadTasks = new ArrayList<>();
                    for (int i = 0; i < downloadableSlides.size(); i++) {
                        SlideInfo slide = downloadableSlides.get(i);
                        int index = slide.getIndex() != null ? slide.getIndex() : (i + 1);
                        String imageName = String.format("%03d.jpg", index);
                        Path imagePath = chapterDir.resolve(imageName);
                        downloadTasks.add(new ImageDownloadService.ImageDownloadTask(slide.getLink(), imagePath));
                    }
                    
                    totalImages += downloadableSlides.size();
                    
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
                        summary.successCount, downloadableSlides.size(), speedMBps, speedImgps, chapterElapsed));
                    
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
    private static final class SlugContext {
        private final String rawSlug;
        private final boolean hasExplicitId;
        private String apiSlug;
        private String fileSlug;
        private Integer titleId;

        SlugContext(String rawSlug, String apiSlug, String fileSlug, Integer titleId, boolean hasExplicitId) {
            this.rawSlug = rawSlug;
            this.apiSlug = apiSlug;
            this.fileSlug = (fileSlug == null || fileSlug.isBlank()) ? rawSlug : fileSlug;
            this.titleId = titleId;
            this.hasExplicitId = hasExplicitId;
        }

        String getRawSlug() {
            return rawSlug;
        }

        String getApiSlug() {
            return apiSlug != null ? apiSlug : fileSlug;
        }

        String getFileSlug() {
            return fileSlug;
        }

        int getDefaultBranchId() {
            return titleId != null ? Integer.parseInt(titleId + "0") : 0;
        }

        void applyId(Integer id) {
            if (id == null) {
                return;
            }
            this.titleId = id;
            if (!hasExplicitId) {
                this.apiSlug = id + "--" + fileSlug;
            }
        }
    }
}
