package shadowshift.studio.parserservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Сервис для управления пулом прокси-серверов
 * Реализует ротацию и отслеживание статистики использования
 */
@Service
public class ProxyManagerService {

    private static final Logger logger = LoggerFactory.getLogger(ProxyManagerService.class);

    // ⚙️ Пороговые значения для оценки скорости прокси
    private static final long SLOW_LATENCY_THRESHOLD_MS = 5_000L;          // >5 секунд на изображение считаем медленным
    private static final long MIN_BYTES_FOR_SPEED_CHECK = 256 * 1024L;     // скорость считаем только для файлов >256KB
    private static final double MIN_SPEED_MB_PER_SEC = 0.5;                // <0.5 MB/s на крупном файле считаем медленным
    private static final int SLOW_STREAK_LIMIT = 3;                        // 3 медленных ответа подряд → карантин
    private static final int RECOVERY_STREAK_LIMIT = 2;                    // 2 быстрых ответа подряд → восстановление
    private static final int FAILURE_STREAK_LIMIT = 2;                     // 2 ошибки подряд → карантин
    private static final long QUARANTINE_DURATION_MS = 60_000L;            // карантин 60 секунд, затем пробный возврат
    
    private final List<ProxyServer> proxyPool = new ArrayList<>();
    private final AtomicInteger currentIndex = new AtomicInteger(0);
    private final Map<String, ProxyStats> proxyStats = new ConcurrentHashMap<>();
    private final Map<String, ProxyHealth> proxyHealth = new ConcurrentHashMap<>();
    private boolean enabled = false;
    
    // ⚡ ОПТИМИЗАЦИЯ: Sticky Proxy Assignment - каждый поток привязан к своему прокси
    private final ThreadLocal<ProxyServer> threadLocalProxy = new ThreadLocal<>();
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @PostConstruct
    public void init() {
        loadProxiesFromConfig();
    }
    
    /**
     * Получает следующий доступный прокси из пула (round-robin)
     */
    public ProxyServer getNextProxy() {
        return findNextProxy(true);
    }
    
    /**
     * ⚡ ОПТИМИЗАЦИЯ: Получает прокси для текущего потока (Sticky Proxy Assignment)
     * Каждый поток будет всегда использовать один и тот же прокси для максимальной
     * эффективности Connection Keep-Alive
     */
    public ProxyServer getProxyForCurrentThread() {
        if (proxyPool.isEmpty()) {
            return null; // Работаем без прокси
        }
        
        ProxyServer proxy = threadLocalProxy.get();

        if (proxy == null || !isProxyUsable(proxy)) {
            proxy = assignProxyToThread();
            if (proxy != null) {
                threadLocalProxy.set(proxy);
                logger.debug("Thread {}: Assigned proxy {}:{} (sticky)",
                    Thread.currentThread().getName(),
                    proxy.getHost(), proxy.getPort());
            } else {
                threadLocalProxy.remove();
            }
        }

        if (proxy != null) {
            recordUsage(proxy);
        }

        return proxy;
    }
    
    /**
     * Назначает прокси потоку при первом запросе
     */
    private ProxyServer assignProxyToThread() {
        return findNextProxy(true);
    }
    
    /**
     * Отмечает прокси как проблемный
     */
    public void reportProxyFailure(ProxyServer proxy) {
        if (proxy != null) {
            ProxyStats stats = proxyStats.computeIfAbsent(proxy.getId(), k -> new ProxyStats(proxy));
            stats.incrementFailures();
            ProxyHealth health = proxyHealth.computeIfAbsent(proxy.getId(), k -> new ProxyHealth());
            health.recordFailure(proxy, "исключение при запросе");
            stats.recordMetrics(0L, 0.0, true, health.getState());
            logger.warn("Прокси {}:{} отмечен как проблемный", proxy.getHost(), proxy.getPort());
        }
    }
    
    /**
     * Загружает список прокси из конфигурации
     */
    private void loadProxiesFromConfig() {
        try {
            ClassPathResource resource = new ClassPathResource("proxies.json");
            
            if (!resource.exists()) {
                logger.warn("Файл proxies.json не найден, работаем без прокси");
                enabled = false;
                return;
            }
            
            JsonNode root = objectMapper.readTree(resource.getInputStream());
            
            enabled = root.has("enabled") && root.get("enabled").asBoolean();
            
            if (!enabled) {
                logger.info("Прокси отключены в конфигурации");
                return;
            }
            
            JsonNode proxiesNode = root.get("proxies");
            if (proxiesNode != null && proxiesNode.isArray()) {
                for (JsonNode proxyNode : proxiesNode) {
                    String host = proxyNode.get("host").asText();
                    int port = proxyNode.get("port").asInt();
                    // Поддерживаем оба формата: "login" (из settings.json) и "username"
                    String username = proxyNode.has("login") ? proxyNode.get("login").asText() : 
                                    (proxyNode.has("username") ? proxyNode.get("username").asText() : null);
                    String password = proxyNode.has("password") ? proxyNode.get("password").asText() : null;
                    
                    ProxyServer proxy = new ProxyServer(host, port, username, password);
                    proxyPool.add(proxy);
                    proxyHealth.put(proxy.getId(), new ProxyHealth());
                }
            }
            
            logger.info("Загружено {} прокси-серверов", proxyPool.size());
            
        } catch (IOException e) {
            logger.error("Ошибка загрузки прокси из конфигурации: {}", e.getMessage(), e);
            enabled = false;
        }
    }
    
    /**
     * Получает статистику использования прокси
     */
    public Map<String, ProxyStats> getProxyStats() {
        return new HashMap<>(proxyStats);
    }

    /**
     * Фиксирует показатели скорости и успешности работы прокси
     */
    public void recordProxySample(ProxyServer proxy, long latencyMs, long bytesDownloaded, boolean success, boolean cached) {
        if (proxy == null || cached) {
            return;
        }

        ProxyHealth health = proxyHealth.computeIfAbsent(proxy.getId(), k -> new ProxyHealth());
        double speedMbPerSec = calculateSpeed(latencyMs, bytesDownloaded);
        boolean sizablePayload = bytesDownloaded >= MIN_BYTES_FOR_SPEED_CHECK;
        boolean slow = !success;
        String reason = success ? null : "ошибка запроса";

        if (success) {
            if (latencyMs > SLOW_LATENCY_THRESHOLD_MS) {
                slow = true;
                reason = String.format("высокая задержка %dмс", latencyMs);
            } else if (sizablePayload && speedMbPerSec < MIN_SPEED_MB_PER_SEC) {
                slow = true;
                reason = String.format("низкая скорость %.2f MB/s", speedMbPerSec);
            }
        }

        health.recordSample(proxy, latencyMs, speedMbPerSec, slow, success, reason);

        ProxyStats stats = proxyStats.computeIfAbsent(proxy.getId(), k -> new ProxyStats(proxy));
        stats.recordMetrics(latencyMs, speedMbPerSec, slow, health.getState());
    }

    private boolean isProxyUsable(ProxyServer proxy) {
        ProxyHealth health = proxyHealth.get(proxy.getId());
        if (health == null) {
            return true;
        }
        return health.isAvailable(proxy);
    }

    private ProxyServer findNextProxy(boolean allowFallback) {
        if (proxyPool.isEmpty()) {
            return null;
        }

        int size = proxyPool.size();
        for (int i = 0; i < size; i++) {
            int index = Math.floorMod(currentIndex.getAndIncrement(), size);
            ProxyServer candidate = proxyPool.get(index);
            if (isProxyUsable(candidate)) {
                recordUsage(candidate);
                return candidate;
            }
        }

        if (allowFallback) {
            int index = Math.floorMod(currentIndex.getAndIncrement(), size);
            ProxyServer fallback = proxyPool.get(index);
            logger.warn("Все прокси находятся в карантине. Возвращаем {}:{} для пробного использования", 
                fallback.getHost(), fallback.getPort());
            recordUsage(fallback);
            return fallback;
        }

        return null;
    }

    private void recordUsage(ProxyServer proxy) {
        if (proxy == null) {
            return;
        }
        proxyStats.computeIfAbsent(proxy.getId(), k -> new ProxyStats(proxy)).incrementUsage();
    }

    private double calculateSpeed(long latencyMs, long bytesDownloaded) {
        if (latencyMs <= 0 || bytesDownloaded <= 0) {
            return Double.POSITIVE_INFINITY;
        }

        double seconds = latencyMs / 1000.0;
        if (seconds <= 0.0) {
            return Double.POSITIVE_INFINITY;
        }

        double megabytes = bytesDownloaded / 1024.0 / 1024.0;
        return megabytes / seconds;
    }
    
    /**
     * Информация о прокси-сервере
     */
    public static class ProxyServer {
        private final String host;
        private final int port;
        private final String username;
        private final String password;
        private final String id;
        
        public ProxyServer(String host, int port) {
            this(host, port, null, null);
        }
        
        public ProxyServer(String host, int port, String username, String password) {
            this.host = host;
            this.port = port;
            this.username = username;
            this.password = password;
            this.id = host + ":" + port;
        }
        
        public String getHost() { return host; }
        public int getPort() { return port; }
        public String getUsername() { return username; }
        public String getPassword() { return password; }
        public String getId() { return id; }
        
        public boolean hasAuth() {
            return username != null && !username.isEmpty();
        }
    }
    
    /**
     * Статистика использования прокси
     */
    public static class ProxyStats {
        private final String id;
        private final String host;
        private final int port;
        private final AtomicInteger usageCount = new AtomicInteger(0);
        private final AtomicInteger failureCount = new AtomicInteger(0);
        private volatile long lastLatencyMs = 0L;
        private volatile double lastSpeedMbPerSec = Double.POSITIVE_INFINITY;
        private volatile boolean lastSlow = false;
        private volatile ProxyState currentState = ProxyState.ACTIVE;

        public ProxyStats(ProxyServer proxy) {
            this.id = proxy.getId();
            this.host = proxy.getHost();
            this.port = proxy.getPort();
        }

        public void incrementUsage() {
            usageCount.incrementAndGet();
        }

        public void incrementFailures() {
            failureCount.incrementAndGet();
        }

        public void recordMetrics(long latencyMs, double speedMbPerSec, boolean slow, ProxyState state) {
            this.lastLatencyMs = latencyMs;
            this.lastSpeedMbPerSec = speedMbPerSec;
            this.lastSlow = slow;
            this.currentState = state;
        }

        public int getUsageCount() { return usageCount.get(); }
        public int getFailureCount() { return failureCount.get(); }
        public double getSuccessRate() {
            int total = usageCount.get();
            if (total == 0) return 0.0;
            return (total - failureCount.get()) * 100.0 / total;
        }

        public long getLastLatencyMs() { return lastLatencyMs; }
        public double getLastSpeedMbPerSec() { return lastSpeedMbPerSec; }
        public boolean isLastSlow() { return lastSlow; }
        public ProxyState getCurrentState() { return currentState; }
        public String getHost() { return host; }
        public int getPort() { return port; }
        public String getId() { return id; }
    }

    private enum ProxyState {
        ACTIVE,
        RECOVERING,
        QUARANTINED
    }

    private class ProxyHealth {
        private ProxyState state = ProxyState.ACTIVE;
        private int slowStreak = 0;
        private int fastStreak = 0;
        private int failureStreak = 0;
        private long lastStateChange = System.currentTimeMillis();

        synchronized boolean isAvailable(ProxyServer proxy) {
            if (state == ProxyState.ACTIVE || state == ProxyState.RECOVERING) {
                return true;
            }

            long now = System.currentTimeMillis();
            if (state == ProxyState.QUARANTINED && now - lastStateChange >= QUARANTINE_DURATION_MS) {
                state = ProxyState.RECOVERING;
                slowStreak = 0;
                fastStreak = 0;
                failureStreak = 0;
                lastStateChange = now;
                logger.info("🩺 Прокси {}:{} возвращается из карантина для пробного использования", proxy.getHost(), proxy.getPort());
                return true;
            }

            return false;
        }

        synchronized void recordSample(ProxyServer proxy, long latencyMs, double speedMbPerSec, boolean slow, boolean success, String slowReason) {
            if (!success) {
                failureStreak++;
            } else {
                failureStreak = 0;
            }

            if (slow) {
                slowStreak++;
                fastStreak = 0;
            } else {
                fastStreak++;
                slowStreak = 0;
            }

            if (failureStreak >= FAILURE_STREAK_LIMIT) {
                quarantine(proxy, latencyMs, speedMbPerSec, slowReason != null ? slowReason : "серия ошибок");
                return;
            }

            if (slow && slowStreak >= SLOW_STREAK_LIMIT) {
                String reason = slowReason != null ? slowReason : "длительные ответы";
                quarantine(proxy, latencyMs, speedMbPerSec, reason);
                return;
            }

            if (!slow && state == ProxyState.RECOVERING && fastStreak >= RECOVERY_STREAK_LIMIT) {
                state = ProxyState.ACTIVE;
                lastStateChange = System.currentTimeMillis();
                logger.info("✅ Прокси {}:{} возвращён в активный пул после {} успешных ответов", proxy.getHost(), proxy.getPort(), fastStreak);
            }
        }

        synchronized void recordFailure(ProxyServer proxy, String reason) {
            failureStreak++;
            slowStreak++;
            fastStreak = 0;
            if (failureStreak >= FAILURE_STREAK_LIMIT) {
                quarantine(proxy, 0L, 0.0, reason + " (" + failureStreak + " подряд)");
            }
        }

        synchronized ProxyState getState() {
            return state;
        }

        private void quarantine(ProxyServer proxy, long latencyMs, double speedMbPerSec, String reason) {
            if (state == ProxyState.QUARANTINED) {
                return;
            }
            state = ProxyState.QUARANTINED;
            lastStateChange = System.currentTimeMillis();
            slowStreak = 0;
            fastStreak = 0;
            failureStreak = 0;
            logger.warn("⛔ Прокси {}:{} отправлен в карантин: {} (latency={}ms, speed={} MB/s)",
                proxy.getHost(), proxy.getPort(), reason, latencyMs, Double.isInfinite(speedMbPerSec) ? "inf" : String.format("%.2f", speedMbPerSec));

            ProxyServer threadProxy = threadLocalProxy.get();
            if (threadProxy == proxy) {
                threadLocalProxy.remove();
            }
        }
    }
}
