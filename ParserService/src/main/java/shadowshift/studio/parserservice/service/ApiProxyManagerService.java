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
 * Сервис для управления пулом прокси-серверов для API запросов
 * Использует отдельный набор прокси (не российских) для обхода блокировок MangaLib API
 */
@Service
public class ApiProxyManagerService {

    private static final Logger logger = LoggerFactory.getLogger(ApiProxyManagerService.class);
    
    private final List<ProxyManagerService.ProxyServer> proxyPool = new ArrayList<>();
    private final AtomicInteger currentIndex = new AtomicInteger(0);
    private final Map<String, ProxyManagerService.ProxyStats> proxyStats = new ConcurrentHashMap<>();
    private boolean enabled = false;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    @PostConstruct
    public void init() {
        loadProxiesFromConfig();
    }
    
    /**
     * Получает следующий доступный API прокси из пула (round-robin)
     */
    public ProxyManagerService.ProxyServer getNextProxy() {
        if (!enabled || proxyPool.isEmpty()) {
            return null; // Работаем без прокси
        }
        
        int index = currentIndex.getAndUpdate(i -> (i + 1) % proxyPool.size());
        ProxyManagerService.ProxyServer proxy = proxyPool.get(index);
        
        // Обновляем статистику
        proxyStats.computeIfAbsent(proxy.getHost(), k -> new ProxyManagerService.ProxyStats()).incrementUsage();
        
        return proxy;
    }
    
    /**
     * Отмечает прокси как проблемный
     */
    public void reportProxyFailure(ProxyManagerService.ProxyServer proxy) {
        if (proxy != null) {
            proxyStats.computeIfAbsent(proxy.getHost(), k -> new ProxyManagerService.ProxyStats()).incrementFailures();
            logger.warn("API прокси {} отмечен как проблемный", proxy.getHost());
        }
    }
    
    /**
     * Загружает список API прокси из конфигурации
     */
    private void loadProxiesFromConfig() {
        try {
            ClassPathResource resource = new ClassPathResource("api-proxies.json");
            
            if (!resource.exists()) {
                logger.warn("Файл api-proxies.json не найден, API запросы будут без прокси");
                enabled = false;
                return;
            }
            
            JsonNode root = objectMapper.readTree(resource.getInputStream());
            
            enabled = root.has("enabled") && root.get("enabled").asBoolean();
            
            if (!enabled) {
                logger.info("API прокси отключены в конфигурации");
                return;
            }
            
            JsonNode proxiesNode = root.get("proxies");
            if (proxiesNode != null && proxiesNode.isArray()) {
                for (JsonNode proxyNode : proxiesNode) {
                    String host = proxyNode.get("host").asText();
                    int port = proxyNode.get("port").asInt();
                    String username = proxyNode.has("username") ? proxyNode.get("username").asText() : null;
                    String password = proxyNode.has("password") ? proxyNode.get("password").asText() : null;
                    
                    ProxyManagerService.ProxyServer proxy = new ProxyManagerService.ProxyServer(host, port, username, password);
                    proxyPool.add(proxy);
                }
            }
            
            logger.info("🌍 Загружено {} API прокси-серверов (не российских)", proxyPool.size());
            
        } catch (IOException e) {
            logger.error("Ошибка загрузки API прокси из конфигурации: {}", e.getMessage(), e);
            enabled = false;
        }
    }
    
    /**
     * Получает статистику использования API прокси
     */
    public Map<String, ProxyManagerService.ProxyStats> getProxyStats() {
        return new HashMap<>(proxyStats);
    }
    
    /**
     * Проверяет, включены ли API прокси
     */
    public boolean isEnabled() {
        return enabled;
    }
    
    /**
     * Получает количество доступных API прокси
     */
    public int getProxyCount() {
        return proxyPool.size();
    }
}
