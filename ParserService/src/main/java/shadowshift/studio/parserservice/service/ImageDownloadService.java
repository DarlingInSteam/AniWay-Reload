package shadowshift.studio.parserservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import shadowshift.studio.parserservice.config.ParserProperties;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.*;

/**
 * Сервис для параллельной загрузки изображений с использованием пула прокси
 */
@Service
public class ImageDownloadService {

    private static final Logger logger = LoggerFactory.getLogger(ImageDownloadService.class);
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Autowired
    private ProxyManagerService proxyManager;
    
    @Autowired
    private ParserProperties properties;
    
    private final ExecutorService executorService = Executors.newFixedThreadPool(20);
    
    /**
     * Загружает изображение по URL в указанный путь
     */
    public CompletableFuture<Boolean> downloadImage(String imageUrl, Path outputPath) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                // Создаем директорию если нет
                Files.createDirectories(outputPath.getParent());
                
                // Если файл уже существует - пропускаем
                if (Files.exists(outputPath)) {
                    logger.debug("Файл уже существует: {}", outputPath);
                    return true;
                }
                
                // Загружаем изображение
                HttpHeaders headers = new HttpHeaders();
                headers.set("User-Agent", "Mozilla/5.0");
                headers.set("Referer", "https://mangalib.me/");
                HttpEntity<String> entity = new HttpEntity<>(headers);
                
                ResponseEntity<byte[]> response = restTemplate.exchange(
                    imageUrl, 
                    HttpMethod.GET, 
                    entity, 
                    byte[].class
                );
                
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    Files.write(outputPath, response.getBody());
                    logger.debug("Загружено изображение: {}", outputPath.getFileName());
                    return true;
                } else {
                    logger.error("Не удалось загрузить изображение {}: {}", imageUrl, response.getStatusCode());
                    return false;
                }
                
            } catch (Exception e) {
                logger.error("Ошибка загрузки изображения {}: {}", imageUrl, e.getMessage());
                return false;
            }
        }, executorService);
    }
    
    /**
     * Загружает список изображений параллельно
     */
    public CompletableFuture<Integer> downloadImages(java.util.List<ImageDownloadTask> tasks) {
        logger.info("Начало загрузки {} изображений...", tasks.size());
        
        java.util.List<CompletableFuture<Boolean>> futures = tasks.stream()
            .map(task -> downloadImage(task.url, task.outputPath))
            .collect(java.util.stream.Collectors.toList());
        
        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
            .thenApply(v -> {
                long successCount = futures.stream()
                    .map(CompletableFuture::join)
                    .filter(success -> success)
                    .count();
                    
                logger.info("Загружено {}/{} изображений", successCount, tasks.size());
                return (int) successCount;
            });
    }
    
    /**
     * Задача загрузки изображения
     */
    public static class ImageDownloadTask {
        public final String url;
        public final Path outputPath;
        
        public ImageDownloadTask(String url, Path outputPath) {
            this.url = url;
            this.outputPath = outputPath;
        }
    }
}
