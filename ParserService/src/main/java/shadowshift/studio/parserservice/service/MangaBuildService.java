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
import shadowshift.studio.parserservice.dto.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
    
    /**
     * Запускает процесс билда манги (загрузка всех изображений)
     */
    public String startBuild(String slug, String parser, String branchId) {
        String taskId = UUID.randomUUID().toString();
        BuildTask task = taskStorage.createBuildTask(taskId, slug, parser);
        
        // Запускаем асинхронно
        CompletableFuture.runAsync(() -> executeBuild(task, slug, branchId));
        
        return taskId;
    }
    
    /**
     * Выполняет билд манги
     */
    private void executeBuild(BuildTask task, String slug, String branchId) {
        try {
            task.updateStatus("running", 5, "Загрузка метаданных манги...");
            
            // Нормализуем slug
            String normalizedSlug = normalizeSlug(slug);
            
            // Загружаем JSON с метаданными (должен быть создан после parse)
            Path jsonPath = Paths.get(properties.getOutputPath(), normalizedSlug + ".json");
            if (!Files.exists(jsonPath)) {
                throw new IOException("Метаданные не найдены. Сначала выполните parse для " + normalizedSlug);
            }
            
            // Читаем метаданные
            JsonNode rootNode = objectMapper.readTree(jsonPath.toFile());
            JsonNode chaptersNode = rootNode.get("chapters");
            
            if (chaptersNode == null || !chaptersNode.isArray()) {
                throw new IOException("Некорректный формат метаданных");
            }
            
            List<ChapterInfo> chapters = new ArrayList<>();
            for (JsonNode chNode : chaptersNode) {
                ChapterInfo chapter = objectMapper.treeToValue(chNode, ChapterInfo.class);
                chapters.add(chapter);
            }
            
            task.setTotalChapters(chapters.size());
            task.updateProgress(10, String.format("Найдено %d глав для загрузки", chapters.size()));
            
            // Создаем директорию для изображений
            Path imagesDir = Paths.get(properties.getOutputPath(), normalizedSlug, "images");
            Files.createDirectories(imagesDir);
            
            // Загружаем изображения для каждой главы
            int chapterIndex = 0;
            int totalImages = 0;
            
            for (ChapterInfo chapter : chapters) {
                chapterIndex++;
                
                if (chapter.getIsPaid() != null && chapter.getIsPaid()) {
                    task.addLog(String.format("[%d/%d] Пропуск платной главы %.1f", 
                        chapterIndex, chapters.size(), chapter.getNumber()));
                    continue;
                }
                
                task.addLog(String.format("[%d/%d] Загрузка главы %.1f: %s", 
                    chapterIndex, chapters.size(), chapter.getNumber(), 
                    chapter.getTitle() != null ? chapter.getTitle() : ""));
                
                try {
                    // Получаем список изображений главы
                    List<String> imageUrls = fetchChapterImages(normalizedSlug, chapter.getChapterId());
                    
                    if (imageUrls.isEmpty()) {
                        task.addLog(String.format("  Главе %.1f: изображения не найдены", chapter.getNumber()));
                        continue;
                    }
                    
                    // Создаем директорию главы
                    String chapterDirName = String.format("ch_%.1f", chapter.getNumber()).replace(",", ".");
                    Path chapterDir = imagesDir.resolve(chapterDirName);
                    Files.createDirectories(chapterDir);
                    
                    // Подготавливаем задачи загрузки
                    List<ImageDownloadService.ImageDownloadTask> downloadTasks = new ArrayList<>();
                    for (int i = 0; i < imageUrls.size(); i++) {
                        String imageUrl = imageUrls.get(i);
                        String imageName = String.format("%03d.jpg", i + 1);
                        Path imagePath = chapterDir.resolve(imageName);
                        downloadTasks.add(new ImageDownloadService.ImageDownloadTask(imageUrl, imagePath));
                    }
                    
                    totalImages += imageUrls.size();
                    task.setTotalImages(totalImages);
                    
                    // Загружаем изображения параллельно
                    int downloaded = imageDownloader.downloadImages(downloadTasks).join();
                    task.setDownloadedImages(task.getDownloadedImages() + downloaded);
                    
                    task.addLog(String.format("  Загружено %d/%d изображений", downloaded, imageUrls.size()));
                    task.setCompletedChapters(chapterIndex);
                    
                    int progress = 10 + (chapterIndex * 85 / chapters.size());
                    task.updateProgress(progress, String.format("Обработано %d/%d глав", chapterIndex, chapters.size()));
                    
                } catch (Exception e) {
                    task.addLog(String.format("  Ошибка загрузки главы %.1f: %s", chapter.getNumber(), e.getMessage()));
                    logger.error("Ошибка загрузки главы {}: {}", chapter.getNumber(), e.getMessage(), e);
                }
            }
            
            task.updateStatus("completed", 100, String.format("Билд завершен: загружено %d изображений из %d глав", 
                task.getDownloadedImages(), task.getCompletedChapters()));
            
        } catch (Exception e) {
            logger.error("Ошибка билда манги {}: {}", slug, e.getMessage(), e);
            task.updateStatus("failed", 0, "Ошибка: " + e.getMessage());
        }
    }
    
    /**
     * Получает список URL изображений главы
     */
    private List<String> fetchChapterImages(String slug, String chapterId) throws IOException {
        String url = MANGALIB_API_BASE + "/manga/" + slug + "/chapter/" + chapterId;
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Mozilla/5.0");
        HttpEntity<String> entity = new HttpEntity<>(headers);
        
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
        
        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IOException("Не удалось получить данные главы: " + response.getStatusCode());
        }
        
        JsonNode root = objectMapper.readTree(response.getBody());
        JsonNode data = root.get("data");
        JsonNode pages = data.get("pages");
        
        List<String> imageUrls = new ArrayList<>();
        
        if (pages != null && pages.isArray()) {
            for (JsonNode page : pages) {
                String imageUrl = page.get("image").asText();
                imageUrls.add(imageUrl);
            }
        }
        
        return imageUrls;
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
}
