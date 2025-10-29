package shadowshift.studio.parserservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
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
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

/**
 * Сервис для сборки манги (download изображений глав)
 */
@Service
public class MangaBuildService {

    private static final Logger logger = LoggerFactory.getLogger(MangaBuildService.class);

    @Autowired
    private ParserProperties properties;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @Autowired
    private ImageDownloadService imageDownloader;
    
    @Autowired
    private TaskService taskService;

    @Autowired
    private MangaLibParserService parserService;
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
            if (chaptersNode == null || !chaptersNode.isArray() || chaptersNode.isEmpty()) {
                JsonNode contentNode = rootNode.get("content");
                if (contentNode != null && contentNode.isObject()) {
                    ArrayNode merged = objectMapper.createArrayNode();
                    ObjectNode contentObject = (ObjectNode) contentNode;
                    contentObject.fieldNames().forEachRemaining(field -> {
                        JsonNode branchChapters = contentObject.get(field);
                        if (branchChapters != null && branchChapters.isArray()) {
                            branchChapters.forEach(merged::add);
                        }
                    });
                    if (merged.size() > 0) {
                        chaptersNode = merged;
                        logger.debug("Метаданные {} не содержат массива chapters, используем content", slugContext.getFileSlug());
                    }
                }
            }

            Integer titleId = extractTitleId(rootNode);
            slugContext.applyId(titleId);
            int defaultBranchId = slugContext.getDefaultBranchId();
            
            if (chaptersNode == null || !chaptersNode.isArray()) {
                throw new IOException("Invalid metadata format: missing or invalid 'chapters' array");
            }
            
            List<ChapterInfo> allChapters = new ArrayList<>();
            for (JsonNode chNode : chaptersNode) {
                ChapterInfo chapter = objectMapper.treeToValue(chNode, ChapterInfo.class);
                allChapters.add(chapter);
            }
            
            // АВТОМАТИЧЕСКАЯ фильтрация по ветке:
            // 1. Если вручную указан branchId — используем его (редкий кейс для админов)
            // 2. Если titleId известен — берём дефолтную ветку (titleId * 10)
            // 3. Если дефолтная ветка пуста — берём первую непустую ветку
            // 4. Если веток нет вообще — берём все главы (маловероятно)
            final List<ChapterInfo> chapters;  // ⚡ КРИТИЧНО: final для использования в lambda
            String branchIdParam = task.getBranchId();
            
            if (branchIdParam != null && !branchIdParam.isBlank()) {
                // Ручное указание ветки (админский кейс)
                Integer targetBranch = parseIntegerSafe(branchIdParam);
                chapters = allChapters.stream()
                    .filter(ch -> ch.getBranchId() != null && ch.getBranchId().equals(targetBranch))
                    .collect(Collectors.toList());
                taskService.appendLog(task, String.format("🔀 Manual branch %s: %d/%d chapters", 
                    branchIdParam, chapters.size(), allChapters.size()));
            } else if (titleId != null && titleId > 0) {
                // Автоматика: пробуем дефолтную ветку
                List<ChapterInfo> defaultBranchChapters = allChapters.stream()
                    .filter(ch -> ch.getBranchId() != null && ch.getBranchId().equals(defaultBranchId))
                    .collect(Collectors.toList());
                
                if (!defaultBranchChapters.isEmpty()) {
                    chapters = defaultBranchChapters;
                    taskService.appendLog(task, String.format("🔀 Auto: default branch %d → %d/%d chapters", 
                        defaultBranchId, chapters.size(), allChapters.size()));
                } else {
                    // Дефолтная ветка пуста → ищем первую непустую
                    Map<Integer, Long> branchCounts = allChapters.stream()
                        .filter(ch -> ch.getBranchId() != null)
                        .collect(Collectors.groupingBy(ChapterInfo::getBranchId, Collectors.counting()));
                    
                    Integer firstNonEmptyBranch = branchCounts.entrySet().stream()
                        .filter(e -> e.getValue() > 0)
                        .min(Map.Entry.comparingByKey())
                        .map(Map.Entry::getKey)
                        .orElse(null);
                    
                    if (firstNonEmptyBranch != null) {
                        chapters = allChapters.stream()
                            .filter(ch -> ch.getBranchId() != null && ch.getBranchId().equals(firstNonEmptyBranch))
                            .collect(Collectors.toList());
                        taskService.appendLog(task, String.format("🔀 Auto: default branch %d empty, using branch %d → %d/%d chapters", 
                            defaultBranchId, firstNonEmptyBranch, chapters.size(), allChapters.size()));
                    } else {
                        // Fallback: нет веток с главами (маловероятно)
                        chapters = allChapters;
                        taskService.appendLog(task, String.format("⚠️ Auto: no branches found, using all %d chapters", 
                            allChapters.size()));
                    }
                }
            } else {
                // titleId неизвестен → ищем первую непустую ветку
                Map<Integer, Long> branchCounts = allChapters.stream()
                    .filter(ch -> ch.getBranchId() != null)
                    .collect(Collectors.groupingBy(ChapterInfo::getBranchId, Collectors.counting()));
                
                Integer firstNonEmptyBranch = branchCounts.entrySet().stream()
                    .filter(e -> e.getValue() > 0)
                    .min(Map.Entry.comparingByKey())
                    .map(Map.Entry::getKey)
                    .orElse(null);
                
                if (firstNonEmptyBranch != null) {
                    chapters = allChapters.stream()
                        .filter(ch -> ch.getBranchId() != null && ch.getBranchId().equals(firstNonEmptyBranch))
                        .collect(Collectors.toList());
                    taskService.appendLog(task, String.format("🔀 Auto: no titleId, using first branch %d → %d/%d chapters", 
                        firstNonEmptyBranch, chapters.size(), allChapters.size()));
                } else {
                    // Fallback: нет веток вообще
                    chapters = allChapters;
                    taskService.appendLog(task, String.format("📋 Auto: no branches detected, using all %d chapters", 
                        allChapters.size()));
                }
            }
            
            task.setMessage(String.format("Found %d chapters to download", chapters.size()));
            task.setProgress(10);
            taskService.appendLog(task, String.format("📋 Loaded metadata: %d chapters from %s", chapters.size(), jsonPath));
            
            // Extract actual slug from JSON filename for consistent directory structure
            String jsonFileName = jsonPath.getFileName().toString();
            String actualSlug = jsonFileName.substring(0, jsonFileName.length() - 5); // Remove ".json"
            
            // Create archives directory using the actual slug from JSON (like MelonService)
            Path archivesDir = Paths.get(properties.getOutputPath(), "archives", actualSlug);
            Files.createDirectories(archivesDir);
            taskService.appendLog(task, String.format("📁 Created archives directory: %s", archivesDir));
            
            // ⚡ КРИТИЧНО: Параллельная загрузка глав для максимальной скорости
            int maxParallelChapters = properties.getMaxParallelChapters();
            taskService.appendLog(task, String.format("⚡ Downloading chapters with parallelism: %d chapters at once, %d images per chapter", 
                maxParallelChapters, properties.getMaxParallelDownloads()));
            
            // Download images for each chapter (PARALLEL!)
            AtomicInteger chapterIndex = new AtomicInteger(0);
            AtomicInteger totalImages = new AtomicInteger(0);
            AtomicInteger downloadedImages = new AtomicInteger(0);
            AtomicInteger skippedChapters = new AtomicInteger(0);
            
            // Разбиваем главы на батчи для параллельной загрузки
            int batchSize = maxParallelChapters;
            List<List<ChapterInfo>> batches = new ArrayList<>();
            for (int i = 0; i < chapters.size(); i += batchSize) {
                batches.add(chapters.subList(i, Math.min(i + batchSize, chapters.size())));
            }
            
            taskService.appendLog(task, String.format("📦 Split %d chapters into %d batches", chapters.size(), batches.size()));
            
            for (List<ChapterInfo> batch : batches) {
                // Обрабатываем батч глав параллельно
                List<CompletableFuture<Void>> futures = batch.stream()
                    .map(chapter -> CompletableFuture.runAsync(() -> {
                        int currentIndex = chapterIndex.incrementAndGet();
                        
                        if (chapter.getIsPaid() != null && chapter.getIsPaid()) {
                            skippedChapters.incrementAndGet();
                            taskService.appendLog(task, String.format("⏭️ [%d/%d] Skipping paid chapter %.1f", 
                                currentIndex, chapters.size(), chapter.getNumber()));
                            return;
                        }
                        
                        task.setMessage(String.format("Downloading chapter %d/%d (%.1f)", 
                            currentIndex, chapters.size(), chapter.getNumber()));
                        taskService.appendLog(task, String.format("📥 [%d/%d] Downloading chapter %.1f: %s", 
                            currentIndex, chapters.size(), chapter.getNumber(), 
                            chapter.getTitle() != null ? chapter.getTitle() : ""));
                        
                        try {
                            // Get chapter image URLs
                            List<SlideInfo> slides = chapter.getSlides();
                            if (slides == null || slides.isEmpty()) {
                                ChapterPath chapterPath = resolveChapterPath(slugContext, chapter);
                                if (chapterPath == null) {
                                    taskService.appendLog(task, String.format("   ⚠️ Chapter %.1f: unable to resolve chapter path", chapter.getNumber()));
                                    return;
                                }
                                slides = parserService.fetchChapterSlides(chapterPath.slug(), chapterPath.volumeSegment(), chapterPath.chapterSegment());
                                chapter.setSlides(slides);
                                logger.debug("Fetched {} slides from MangaBuff for chapter {}", slides.size(), chapter.getNumber());
                            } else {
                                logger.debug("Using {} slides from cached JSON for chapter {}", slides.size(), chapter.getNumber());
                            }

                            List<SlideInfo> downloadableSlides = slides.stream()
                                    .filter(Objects::nonNull)
                                    .filter(slide -> slide.getLink() != null && !slide.getLink().isBlank())
                                    .collect(Collectors.toList());

                            if (downloadableSlides.isEmpty()) {
                                taskService.appendLog(task, String.format("   ⚠️ Chapter %.1f: no images found", chapter.getNumber()));
                                return;
                            }
                            
                            // Create chapter directory with volume prefix to avoid collisions
                            String chapterDirName;
                            Object volumeObj = chapter.getVolume();
                            String volumeStr = volumeObj != null ? volumeObj.toString().trim() : "";
                            
                            // Include volume number in folder name if present
                            if (!volumeStr.isEmpty() && !volumeStr.equals("0")) {
                                chapterDirName = String.format("v%s_ch_%.1f", volumeStr, chapter.getNumber()).replace(",", ".");
                            } else {
                                chapterDirName = String.format("ch_%.1f", chapter.getNumber()).replace(",", ".");
                            }
                            
                            Path chapterDir = archivesDir.resolve(chapterDirName);
                            Files.createDirectories(chapterDir);
                            
                            // Сохраняем имя папки в ChapterInfo для последующего импорта
                            chapter.setFolderName(chapterDirName);
                            
                            // Prepare download tasks
                            List<ImageDownloadService.ImageDownloadTask> downloadTasks = new ArrayList<>();
                            for (int i = 0; i < downloadableSlides.size(); i++) {
                                SlideInfo slide = downloadableSlides.get(i);
                                int index = slide.getIndex() != null ? slide.getIndex() : (i + 1);
                                String imageName = String.format("%03d.jpg", index);
                                Path imagePath = chapterDir.resolve(imageName);
                                downloadTasks.add(new ImageDownloadService.ImageDownloadTask(slide.getLink(), imagePath));
                            }
                            
                            totalImages.addAndGet(downloadableSlides.size());
                            
                            // Download images in parallel
                            long chapterStartTime = System.currentTimeMillis();
                            ImageDownloadService.DownloadSummary summary = imageDownloader.downloadImages(downloadTasks).join();
                            long chapterElapsed = System.currentTimeMillis() - chapterStartTime;
                            
                            downloadedImages.addAndGet(summary.successCount);
                            
                            double speedMBps = summary.totalTime > 0 ? 
                                (summary.totalBytes / 1024.0 / 1024.0) / (summary.totalTime / 1000.0) : 0;
                            double speedImgps = summary.totalTime > 0 ? 
                                (summary.totalImages * 1000.0) / summary.totalTime : 0;
                            
                            taskService.appendLog(task, String.format("   ✅ Downloaded %d/%d images (%.2f MB/s, %.1f img/s, %dms)", 
                                summary.successCount, downloadableSlides.size(), speedMBps, speedImgps, chapterElapsed));
                            
                            int progress = 10 + (currentIndex * 85 / chapters.size());
                            task.setProgress(progress);
                            task.setMessage(String.format("Processed %d/%d chapters", currentIndex, chapters.size()));
                            
                        } catch (Exception e) {
                            taskService.appendLog(task, String.format("   ❌ Error downloading chapter %.1f: %s", 
                                chapter.getNumber(), e.getMessage()));
                            logger.error("Error downloading chapter {}: {}", chapter.getNumber(), e.getMessage(), e);
                        }
                    }))
                    .collect(Collectors.toList());
                
                // Ждем завершения батча перед переходом к следующему
                CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
            }
            
            long totalElapsed = System.currentTimeMillis() - startTime;
            
            // КРИТИЧНО: Пересохраняем JSON с обновленными folder_name после билда
            try {
                logger.info("💾 Updating JSON with folder_name for {} chapters", chapters.size());
                updateJsonWithFolderNames(actualSlug, chapters);
            } catch (Exception jsonEx) {
                logger.warn("⚠️ Failed to update JSON with folder_name: {}", jsonEx.getMessage());
            }
            
            task.setStatus(TaskStatus.COMPLETED);
            task.setCompletedAt(Instant.now());
            task.setProgress(100);
            task.setMessage(String.format("Build completed: %d images from %d chapters (skipped %d paid) in %dms", 
                downloadedImages.get(), chapterIndex.get() - skippedChapters.get(), skippedChapters.get(), totalElapsed));
            taskService.appendLog(task, String.format("🎉 Build completed: %d/%d images downloaded, %d chapters processed, %d skipped, time: %dms", 
                downloadedImages.get(), totalImages.get(), chapterIndex.get() - skippedChapters.get(), skippedChapters.get(), totalElapsed));
            
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
    
    /**
     * Обновляет JSON файл, добавляя folder_name к главам после билда
     */
    private void updateJsonWithFolderNames(String slug, List<ChapterInfo> chapters) throws IOException {
        Path titlesDir = Paths.get(properties.getOutputPath(), "titles");
        Path jsonPath = titlesDir.resolve(slug + ".json");
        
        if (!Files.exists(jsonPath)) {
            logger.warn("JSON file not found for updating: {}", jsonPath);
            return;
        }
        
        // Читаем существующий JSON
        ObjectNode root = (ObjectNode) objectMapper.readTree(jsonPath.toFile());
        
        // Создаем мапу chapterId -> folderName для быстрого поиска
        Map<String, String> folderNameMap = new HashMap<>();
        for (ChapterInfo chapter : chapters) {
            if (chapter.getChapterId() != null && chapter.getFolderName() != null) {
                folderNameMap.put(chapter.getChapterId(), chapter.getFolderName());
            }
        }
        
        // Обновляем content (по branch_id)
        JsonNode contentNode = root.get("content");
        if (contentNode != null && contentNode.isObject()) {
            ObjectNode content = (ObjectNode) contentNode;
            content.properties().forEach(entry -> {
                JsonNode branchChapters = entry.getValue();
                if (branchChapters.isArray()) {
                    ArrayNode chaptersArray = (ArrayNode) branchChapters;
                    for (int i = 0; i < chaptersArray.size(); i++) {
                        ObjectNode chapterNode = (ObjectNode) chaptersArray.get(i);
                        String chapterId = chapterNode.has("id") ? String.valueOf(chapterNode.get("id").asText()) : null;
                        if (chapterId != null && folderNameMap.containsKey(chapterId)) {
                            chapterNode.put("folder_name", folderNameMap.get(chapterId));
                        }
                    }
                }
            });
        }
        
        // Обновляем chapters (плоский массив)
        JsonNode chaptersNode = root.get("chapters");
        if (chaptersNode != null && chaptersNode.isArray()) {
            ArrayNode chaptersArray = (ArrayNode) chaptersNode;
            for (int i = 0; i < chaptersArray.size(); i++) {
                ObjectNode chapterNode = (ObjectNode) chaptersArray.get(i);
                String chapterId = chapterNode.has("id") ? String.valueOf(chapterNode.get("id").asText()) : null;
                if (chapterId != null && folderNameMap.containsKey(chapterId)) {
                    chapterNode.put("folder_name", folderNameMap.get(chapterId));
                }
            }
        }
        
        // Сохраняем обновленный JSON
        objectMapper.writerWithDefaultPrettyPrinter().writeValue(jsonPath.toFile(), root);
        logger.info("✅ Updated JSON with {} folder_name entries", folderNameMap.size());
    }

    private ChapterPath resolveChapterPath(SlugContext slugContext, ChapterInfo chapter) {
        if (chapter == null) {
            return null;
        }
        String relative = chapter.getSlug();
        if (relative == null || relative.isBlank()) {
            logger.warn("Chapter {} has no slug for slide download", chapter.getChapterId());
            return null;
        }
        String normalized = relative.startsWith("/") ? relative.substring(1) : relative;
        String[] parts = normalized.split("/");
        if (parts.length < 4) {
            logger.warn("Unexpected chapter slug format: {}", normalized);
            return null;
        }
        String slug = parts.length >= 2 && !parts[1].isBlank()
                ? parts[1]
                : (slugContext != null ? slugContext.getFileSlug() : null);
        if (slug == null || slug.isBlank()) {
            logger.warn("Unable to determine manga slug for chapter {}", chapter.getChapterId());
            return null;
        }
        String volumeSegment = parts[parts.length - 2];
        String chapterSegment = parts[parts.length - 1];
        return new ChapterPath(slug, volumeSegment, chapterSegment);
    }

    private static final class ChapterPath {
        private final String slug;
        private final String volumeSegment;
        private final String chapterSegment;

        ChapterPath(String slug, String volumeSegment, String chapterSegment) {
            this.slug = slug;
            this.volumeSegment = volumeSegment;
            this.chapterSegment = chapterSegment;
        }

        String slug() {
            return slug;
        }

        String volumeSegment() {
            return volumeSegment;
        }

        String chapterSegment() {
            return chapterSegment;
        }
    }
}
