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
    
    private final List<ProxyServer> proxyPool = new ArrayList<>();
    private final AtomicInteger currentIndex = new AtomicInteger(0);
    private final Map<String, ProxyStats> proxyStats = new ConcurrentHashMap<>();
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
        if (proxyPool.isEmpty()) {
            return null; // Работаем без прокси
        }
        
        int index = currentIndex.getAndUpdate(i -> (i + 1) % proxyPool.size());
        ProxyServer proxy = proxyPool.get(index);
        
        // Обновляем статистику
        proxyStats.computeIfAbsent(proxy.getHost(), k -> new ProxyStats()).incrementUsage();
        
        return proxy;
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
        
        if (proxy == null) {
            // Первый запрос в этом потоке - назначаем прокси round-robin
            proxy = assignProxyToThread();
            threadLocalProxy.set(proxy);
            
            logger.debug("Thread {}: Assigned proxy {} (sticky)", 
                Thread.currentThread().getName(), 
                proxy.getHost());
        }
        
        // Обновляем статистику
        proxyStats.computeIfAbsent(proxy.getHost(), k -> new ProxyStats()).incrementUsage();
        
        return proxy;
    }
    
    /**
     * Назначает прокси потоку при первом запросе
     */
    private ProxyServer assignProxyToThread() {
        int index = currentIndex.getAndUpdate(i -> (i + 1) % proxyPool.size());
        return proxyPool.get(index);
    }
    
    /**
     * Отмечает прокси как проблемный
     */
    public void reportProxyFailure(ProxyServer proxy) {
        if (proxy != null) {
            proxyStats.computeIfAbsent(proxy.getHost(), k -> new ProxyStats()).incrementFailures();
            logger.warn("Прокси {} отмечен как проблемный", proxy.getHost());
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
     * Информация о прокси-сервере
     */
    public static class ProxyServer {
        private final String host;
        private final int port;
        private final String username;
        private final String password;
        
        public ProxyServer(String host, int port) {
            this(host, port, null, null);
        }
        
        public ProxyServer(String host, int port, String username, String password) {
            this.host = host;
            this.port = port;
            this.username = username;
            this.password = password;
        }
        
        public String getHost() { return host; }
        public int getPort() { return port; }
        public String getUsername() { return username; }
        public String getPassword() { return password; }
        
        public boolean hasAuth() {
            return username != null && !username.isEmpty();
        }
    }
    
    /**
     * Статистика использования прокси
     */
    public static class ProxyStats {
        private final AtomicInteger usageCount = new AtomicInteger(0);
        private final AtomicInteger failureCount = new AtomicInteger(0);
        
        public void incrementUsage() {
            usageCount.incrementAndGet();
        }
        
        public void incrementFailures() {
            failureCount.incrementAndGet();
        }
        
        public int getUsageCount() { return usageCount.get(); }
        public int getFailureCount() { return failureCount.get(); }
        public double getSuccessRate() {
            int total = usageCount.get();
            if (total == 0) return 0.0;
            return (total - failureCount.get()) * 100.0 / total;
        }
    }
}
