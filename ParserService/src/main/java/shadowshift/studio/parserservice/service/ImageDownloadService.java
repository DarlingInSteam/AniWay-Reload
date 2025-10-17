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
    
    private final ExecutorService executorService;
    
    public ImageDownloadService(ParserProperties properties) {
        this.properties = properties;
        int poolSize = properties.getMaxParallelDownloads();
        this.executorService = Executors.newFixedThreadPool(poolSize);
        logger.info("🚀 ImageDownloadService initialized with {} parallel threads", poolSize);
    }
    
    /**
     * Загружает изображение по URL в указанный путь
     */
    public CompletableFuture<DownloadResult> downloadImage(String imageUrl, Path outputPath) {
        return CompletableFuture.supplyAsync(() -> {
            long startTime = System.currentTimeMillis();
            long fileSize = 0;
            
            try {
                // Создаем директорию если нет
                Files.createDirectories(outputPath.getParent());
                
                // Если файл уже существует - пропускаем
                if (Files.exists(outputPath)) {
                    fileSize = Files.size(outputPath);
                    logger.debug("✅ File exists: {} ({}KB)", outputPath.getFileName(), fileSize / 1024);
                    return new DownloadResult(true, System.currentTimeMillis() - startTime, fileSize, true);
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
                    byte[] imageData = response.getBody();
                    fileSize = imageData.length;
                    Files.write(outputPath, imageData);
                    
                    long downloadTime = System.currentTimeMillis() - startTime;
                    double speedKBps = (fileSize / 1024.0) / (downloadTime / 1000.0);
                    
                    logger.debug("✅ Downloaded: {} ({}KB in {}ms, {:.1f}KB/s)", 
                        outputPath.getFileName(), fileSize / 1024, downloadTime, speedKBps);
                    
                    return new DownloadResult(true, downloadTime, fileSize, false);
                } else {
                    logger.error("❌ Failed to download {}: {}", imageUrl, response.getStatusCode());
                    return new DownloadResult(false, System.currentTimeMillis() - startTime, 0, false);
                }
                
            } catch (Exception e) {
                logger.error("❌ Error downloading {}: {}", imageUrl, e.getMessage());
                return new DownloadResult(false, System.currentTimeMillis() - startTime, 0, false);
            }
        }, executorService);
    }
    
    /**
     * Загружает список изображений параллельно с периодическим логированием прогресса
     */
    public CompletableFuture<DownloadSummary> downloadImages(java.util.List<ImageDownloadTask> tasks) {
        long startTime = System.currentTimeMillis();
        int totalImages = tasks.size();
        
        logger.info("🚀 [DOWNLOAD START] Total images: {}", totalImages);
        
        java.util.concurrent.atomic.AtomicInteger completed = new java.util.concurrent.atomic.AtomicInteger(0);
        java.util.concurrent.atomic.AtomicInteger successful = new java.util.concurrent.atomic.AtomicInteger(0);
        java.util.concurrent.atomic.AtomicLong totalBytes = new java.util.concurrent.atomic.AtomicLong(0);
        java.util.concurrent.atomic.AtomicInteger cached = new java.util.concurrent.atomic.AtomicInteger(0);
        
        // Прогресс-репортер каждые 10%
        int reportInterval = Math.max(1, totalImages / 10);
        
        java.util.List<CompletableFuture<DownloadResult>> futures = tasks.stream()
            .map(task -> downloadImage(task.url, task.outputPath)
                .thenApply(result -> {
                    int current = completed.incrementAndGet();
                    
                    if (result.success) {
                        successful.incrementAndGet();
                        totalBytes.addAndGet(result.fileSize);
                        if (result.cached) {
                            cached.incrementAndGet();
                        }
                    }
                    
                    // Логируем прогресс каждые reportInterval изображений
                    if (current % reportInterval == 0 || current == totalImages) {
                        long elapsed = System.currentTimeMillis() - startTime;
                        double progress = (current * 100.0) / totalImages;
                        double speedImagesPerSec = (current * 1000.0) / elapsed;
                        long eta = (long) ((totalImages - current) / speedImagesPerSec);
                        
                        logger.info("📊 [PROGRESS] {}/{} images ({:.1f}%), Speed: {:.1f} img/s, ETA: {}s, Success: {}, Cached: {}", 
                            current, totalImages, progress, speedImagesPerSec, eta, successful.get(), cached.get());
                    }
                    
                    return result;
                })
            )
            .collect(java.util.stream.Collectors.toList());
        
        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
            .thenApply(v -> {
                long totalTime = System.currentTimeMillis() - startTime;
                
                java.util.List<DownloadResult> results = futures.stream()
                    .map(CompletableFuture::join)
                    .collect(java.util.stream.Collectors.toList());
                
                int successCount = successful.get();
                int failedCount = totalImages - successCount;
                long totalMB = totalBytes.get() / (1024 * 1024);
                double avgSpeedMBps = (totalBytes.get() / 1024.0 / 1024.0) / (totalTime / 1000.0);
                double avgSpeedImgPerSec = (totalImages * 1000.0) / totalTime;
                
                logger.info("✅ [DOWNLOAD COMPLETE] Total: {}, Success: {}, Failed: {}, Cached: {}", 
                    totalImages, successCount, failedCount, cached.get());
                logger.info("📈 [DOWNLOAD STATS] Time: {}ms, Size: {}MB, Avg Speed: {:.2f}MB/s, {:.1f} img/s", 
                    totalTime, totalMB, avgSpeedMBps, avgSpeedImgPerSec);
                
                return new DownloadSummary(totalImages, successCount, failedCount, 
                    cached.get(), totalBytes.get(), totalTime);
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
    
    /**
     * Результат загрузки одного изображения
     */
    public static class DownloadResult {
        public final boolean success;
        public final long downloadTime;
        public final long fileSize;
        public final boolean cached;
        
        public DownloadResult(boolean success, long downloadTime, long fileSize, boolean cached) {
            this.success = success;
            this.downloadTime = downloadTime;
            this.fileSize = fileSize;
            this.cached = cached;
        }
    }
    
    /**
     * Сводка загрузки изображений
     */
    public static class DownloadSummary {
        public final int totalImages;
        public final int successCount;
        public final int failedCount;
        public final int cachedCount;
        public final long totalBytes;
        public final long totalTime;
        
        public DownloadSummary(int totalImages, int successCount, int failedCount, 
                              int cachedCount, long totalBytes, long totalTime) {
            this.totalImages = totalImages;
            this.successCount = successCount;
            this.failedCount = failedCount;
            this.cachedCount = cachedCount;
            this.totalBytes = totalBytes;
            this.totalTime = totalTime;
        }
    }
}
