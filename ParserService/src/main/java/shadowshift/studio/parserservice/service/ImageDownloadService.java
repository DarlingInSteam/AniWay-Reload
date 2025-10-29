package shadowshift.studio.parserservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import shadowshift.studio.parserservice.config.ParserProperties;
import shadowshift.studio.parserservice.util.MangaBuffApiHelper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.*;

/**
 * Сервис для параллельной загрузки изображений с использованием пула прокси
 */
@Service
public class ImageDownloadService {

    private static final Logger logger = LoggerFactory.getLogger(ImageDownloadService.class);
    private static final long DIRECT_SLOW_THRESHOLD_MS = 4_000L;
    private static final long DIRECT_SLOW_COOLDOWN_MS = 120_000L;
    private static final long DIRECT_MIN_BYTES_FOR_SPEED_CHECK = 256 * 1024L;
    private static final double DIRECT_MIN_SPEED_MBPS = 1.0;
    
    @Autowired
    private org.springframework.context.ApplicationContext applicationContext;
    
    @Autowired
    private ProxyManagerService proxyManager;
    
    private final ExecutorService executorService;
    private final java.util.concurrent.ConcurrentMap<String, Long> cdnCooldowns = new java.util.concurrent.ConcurrentHashMap<>();
    
    public ImageDownloadService(ParserProperties properties) {
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
            int maxRetries = 3;
            ProxyManagerService.ProxyServer currentProxy = null;
            String proxyInfo = "NO_PROXY";
            
            try {
                // Создаем директорию если нет
                Files.createDirectories(outputPath.getParent());
                
                // Если файл уже существует - пропускаем
                if (Files.exists(outputPath)) {
                    fileSize = Files.size(outputPath);
                    logger.debug("✅ File exists: {} ({}KB)", outputPath.getFileName(), fileSize / 1024);
                    return new DownloadResult(true, System.currentTimeMillis() - startTime, fileSize, true, "CACHE");
                }

                DownloadResult directResult = tryDirectCdnDownload(imageUrl, outputPath);
                if (directResult != null) {
                    return directResult;
                }

                // 🔍 Получаем прокси для fallback
                currentProxy = proxyManager.getProxyForCurrentThread();
                proxyInfo = currentProxy != null ? currentProxy.getHost() + ":" + currentProxy.getPort() : "NO_PROXY";
                
                // Retry loop для загрузки
                Exception lastException = null;
                for (int attempt = 0; attempt < maxRetries; attempt++) {
                    try {
                        // Загружаем изображение через единый пул финских прокси
                        RestTemplate restTemplate = applicationContext.getBean(RestTemplate.class);
                        HttpEntity<String> entity = new HttpEntity<>(buildImageRequestHeaders());
                        
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
                            
                            logger.debug("✅ Downloaded: {} ({}KB in {}ms)", 
                                outputPath.getFileName(), fileSize / 1024, downloadTime);
                            proxyManager.recordProxySample(currentProxy, downloadTime, fileSize, true, false);
                            
                            return new DownloadResult(true, downloadTime, fileSize, false, proxyInfo);
                        } else if (attempt < maxRetries - 1) {
                            logger.warn("⚠️ Bad response for {}: {}, retrying ({}/{})", 
                                imageUrl, response.getStatusCode(), attempt + 1, maxRetries);
                            // Задержка между retry для стабильности (200ms, 400ms, 800ms)
                            Thread.sleep((long) (200 * Math.pow(2, attempt)));
                            continue;
                        }
                        
                        logger.error("❌ Failed to download {}: {}", imageUrl, response.getStatusCode());
                        proxyManager.recordProxySample(currentProxy, System.currentTimeMillis() - startTime, 0, false, false);
                        return new DownloadResult(false, System.currentTimeMillis() - startTime, 0, false, proxyInfo);
                        
                    } catch (Exception e) {
                        lastException = e;
                        if (attempt < maxRetries - 1) {
                            logger.warn("⚠️ Error downloading {} (attempt {}/{}): {}", 
                                imageUrl, attempt + 1, maxRetries, e.getMessage());
                            // Задержка между retry для стабильности
                            Thread.sleep((long) (200 * Math.pow(2, attempt)));
                        }
                    }
                }
                
                logger.error("❌ Error downloading {} after {} attempts: {}", 
                    imageUrl, maxRetries, lastException != null ? lastException.getMessage() : "unknown");
                proxyManager.recordProxySample(currentProxy, System.currentTimeMillis() - startTime, 0, false, false);
                return new DownloadResult(false, System.currentTimeMillis() - startTime, 0, false, proxyInfo);
                
            } catch (Exception e) {
                logger.error("❌ Fatal error downloading {}: {}", imageUrl, e.getMessage());
                proxyManager.recordProxySample(currentProxy, System.currentTimeMillis() - startTime, 0, false, false);
                return new DownloadResult(false, System.currentTimeMillis() - startTime, 0, false, proxyInfo != null ? proxyInfo : "NO_PROXY");
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
        
        // 🔍 Map для отслеживания использования прокси
        java.util.Map<String, java.util.concurrent.atomic.AtomicInteger> proxyUsageMap = 
            new java.util.concurrent.ConcurrentHashMap<>();
        
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
                        
                        // 🔍 Подсчитываем использование прокси
                        proxyUsageMap.computeIfAbsent(result.proxyUsed, 
                            k -> new java.util.concurrent.atomic.AtomicInteger(0)).incrementAndGet();
                    }
                    
                    // Логируем прогресс каждые reportInterval изображений
                    if (current % reportInterval == 0 || current == totalImages) {
                        long elapsed = System.currentTimeMillis() - startTime;
                        double progress = (current * 100.0) / totalImages;
                        double speedImagesPerSec = (current * 1000.0) / elapsed;
                        long eta = (long) ((totalImages - current) / speedImagesPerSec);
                        
                        // 🔍 Получаем последний использованный прокси
                        String proxyInfo = result.proxyUsed != null ? 
                            " [Proxy: " + result.proxyUsed.substring(0, Math.min(15, result.proxyUsed.length())) + "...]" : "";
                        
                        logger.info("📊 [PROGRESS] {}/{} images ({}%), Speed: {} img/s, ETA: {}s, Success: {}, Cached: {}{}", 
                            current, totalImages, 
                            String.format("%.1f", progress), 
                            String.format("%.1f", speedImagesPerSec), 
                            eta, successful.get(), cached.get(), proxyInfo);
                    }
                    
                    return result;
                })
            )
            .collect(java.util.stream.Collectors.toList());
        
        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]))
            .thenApply(v -> {
                long totalTime = System.currentTimeMillis() - startTime;
                
                int successCount = successful.get();
                int failedCount = totalImages - successCount;
                long totalMB = totalBytes.get() / (1024 * 1024);
                // Защита от деления на ноль для кэшированных файлов
                double avgSpeedMBps = totalTime > 0 ? (totalBytes.get() / 1024.0 / 1024.0) / (totalTime / 1000.0) : 0.0;
                double avgSpeedImgPerSec = totalTime > 0 ? (totalImages * 1000.0) / totalTime : 0.0;
                
                logger.info("✅ [DOWNLOAD COMPLETE] Total: {}, Success: {}, Failed: {}, Cached: {}", 
                    totalImages, successCount, failedCount, cached.get());
                logger.info("📈 [DOWNLOAD STATS] Time: {}ms, Size: {}MB, Avg Speed: {} MB/s, {} img/s", 
                    totalTime, totalMB, 
                    String.format("%.2f", avgSpeedMBps), 
                    String.format("%.1f", avgSpeedImgPerSec));
                
                // 🔍 Логируем статистику по прокси
                if (!proxyUsageMap.isEmpty()) {
                    logger.info("🔍 [PROXY USAGE STATS]");
                    proxyUsageMap.entrySet().stream()
                        .sorted((e1, e2) -> Integer.compare(e2.getValue().get(), e1.getValue().get()))
                        .forEach(entry -> {
                            int count = entry.getValue().get();
                            double percentage = (count * 100.0) / successCount;
                            logger.info("  📡 {}: {} images ({}%)", 
                                entry.getKey(), count, String.format("%.1f", percentage));
                        });
                }
                
                return new DownloadSummary(totalImages, successCount, failedCount, 
                    cached.get(), totalBytes.get(), totalTime);
            });
    }

    private DownloadResult tryDirectCdnDownload(String imageUrl, Path outputPath) {
        if (!MangaBuffApiHelper.isMangaBuffCdnCandidate(imageUrl)) {
            return null;
        }

        List<String> cdnCandidates = resolveCdnCandidates(imageUrl);
        if (cdnCandidates.isEmpty()) {
            return null;
        }

        RestTemplate directRestTemplate = applicationContext.getBean("chapterRestTemplate", RestTemplate.class);
        HttpEntity<String> requestEntity = new HttpEntity<>(buildImageRequestHeaders());

        boolean attempted = false;

        for (String host : cdnCandidates) {
            if (isHostSuppressed(host)) {
                logger.debug("⏭️ Skipping CDN host {} (cooldown active)", host);
                continue;
            }

            attempted = true;
            String attemptUrl = MangaBuffApiHelper.rewriteImageUrlToHost(imageUrl, host);
            long attemptStart = System.currentTimeMillis();

            try {
                ResponseEntity<byte[]> response = directRestTemplate.exchange(
                        attemptUrl,
                        HttpMethod.GET,
                        requestEntity,
                        byte[].class
                );

                if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                    markHostSlow(host);
                    logger.warn("❌ Direct CDN {} replied {} for {}", host, response.getStatusCode(), attemptUrl);
                    continue;
                }

                byte[] imageData = response.getBody();
                long elapsed = System.currentTimeMillis() - attemptStart;
                long bytes = imageData.length;
                double speed = calculateSpeedMbPerSec(bytes, elapsed);

                if (isSlowDirectResponse(elapsed, bytes, speed)) {
                    markHostSlow(host);
                    logger.warn("🐢 Direct CDN {} slow: {} ms, {} MB/s ({}).", host, elapsed, formatSpeed(speed), attemptUrl);
                    continue;
                }

                Files.write(outputPath, imageData);
                clearHostPenalty(host);
                logger.debug("⚡ Direct CDN {} delivered {}KB in {}ms", host, bytes / 1024, elapsed);
                return new DownloadResult(true, elapsed, bytes, false, "DIRECT:" + host);
            } catch (Exception ex) {
                markHostSlow(host);
                logger.warn("⚠️ Direct CDN {} failed for {}: {}", host, attemptUrl, ex.getMessage());
            }
        }

        if (!attempted) {
            logger.debug("⚠️ All CDN hosts currently in cooldown, skipping direct attempt");
        }

        return null;
    }

    private List<String> resolveCdnCandidates(String imageUrl) {
        List<String> defaults = new ArrayList<>(MangaBuffApiHelper.getImageCdnHosts());
        String preferred = MangaBuffApiHelper.extractImageHost(imageUrl);
        if (preferred != null) {
            if (defaults.remove(preferred)) {
                defaults.add(0, preferred);
            } else {
                defaults.add(0, preferred);
            }
        }
        return defaults;
    }

    private boolean isHostSuppressed(String host) {
        Long slowUntil = cdnCooldowns.get(host);
        if (slowUntil == null) {
            return false;
        }
        if (slowUntil <= System.currentTimeMillis()) {
            cdnCooldowns.remove(host, slowUntil);
            return false;
        }
        return true;
    }

    private void markHostSlow(String host) {
        if (host == null) {
            return;
        }
        cdnCooldowns.put(host, System.currentTimeMillis() + DIRECT_SLOW_COOLDOWN_MS);
    }

    private void clearHostPenalty(String host) {
        if (host == null) {
            return;
        }
        cdnCooldowns.remove(host);
    }

    private double calculateSpeedMbPerSec(long bytes, long durationMs) {
        if (durationMs <= 0 || bytes <= 0) {
            return Double.POSITIVE_INFINITY;
        }
        double seconds = durationMs / 1000.0;
        if (seconds <= 0.0) {
            return Double.POSITIVE_INFINITY;
        }
        double megabytes = bytes / 1024.0 / 1024.0;
        return megabytes / seconds;
    }

    private boolean isSlowDirectResponse(long durationMs, long bytes, double speedMbPerSec) {
        if (durationMs >= DIRECT_SLOW_THRESHOLD_MS) {
            return true;
        }
        if (bytes < DIRECT_MIN_BYTES_FOR_SPEED_CHECK) {
            return false;
        }
        return speedMbPerSec < DIRECT_MIN_SPEED_MBPS;
    }

    private HttpHeaders buildImageRequestHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Mozilla/5.0");
        headers.set("Referer", MangaBuffApiHelper.BASE_URL + "/");
        return headers;
    }

    private String formatSpeed(double value) {
        if (Double.isInfinite(value) || Double.isNaN(value)) {
            return "inf";
        }
        return String.format(Locale.ROOT, "%.2f", value);
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
     * Результат загрузки изображения
     */
    public static class DownloadResult {
        public final boolean success;
        public final long downloadTime;
        public final long fileSize;
        public final boolean cached;
        public final String proxyUsed; // 🔍 Добавили поле
        
        public DownloadResult(boolean success, long downloadTime, long fileSize, boolean cached, String proxyUsed) {
            this.success = success;
            this.downloadTime = downloadTime;
            this.fileSize = fileSize;
            this.cached = cached;
            this.proxyUsed = proxyUsed;
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
