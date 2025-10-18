package shadowshift.studio.parserservice.config;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.apache.hc.core5.http.HttpHost;
import org.apache.hc.core5.util.Timeout;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Scope;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;
import shadowshift.studio.parserservice.service.ProxyManagerService;
import shadowshift.studio.parserservice.service.ProxyManagerService.ProxyServer;

@Configuration
public class RestTemplateConfig {
    
    private static final Logger logger = LoggerFactory.getLogger(RestTemplateConfig.class);

    @Autowired
    private ProxyManagerService proxyManager;
    
    // ⚡ ОПТИМИЗАЦИЯ: Общий Connection Pool для ВСЕХ прокси (переиспользование соединений)
    private PoolingHttpClientConnectionManager sharedConnectionManager;
    
    @PostConstruct
    public void initConnectionPool() {
        logger.info("🚀 Инициализация общего Connection Pool для всех прокси...");
        
        sharedConnectionManager = new PoolingHttpClientConnectionManager();
        sharedConnectionManager.setMaxTotal(200);          // 20 прокси × 10 соединений
        sharedConnectionManager.setDefaultMaxPerRoute(10); // 10 соединений на прокси (оптимально для 20 прокси)
        
        logger.info("✅ Connection Pool создан: MaxTotal=200, MaxPerRoute=10 (оптимально для 20 прокси, 1 глава)");
    }
    
    @PreDestroy
    public void closeConnectionPool() {
        if (sharedConnectionManager != null) {
            logger.info("🔒 Закрытие общего Connection Pool...");
            sharedConnectionManager.close();
        }
    }

    /**
     * Создаёт RestTemplate с автоматической ротацией прокси
     * ⚡ ОПТИМИЗАЦИЯ: Использует Sticky Proxy Assignment (каждый поток привязан к своему прокси)
     */
    @Bean
    @Primary
    @Scope("prototype")
    public RestTemplate restTemplate() {
        // ⚡ ОПТИМИЗАЦИЯ: Получаем прокси для текущего потока (sticky assignment)
        ProxyServer proxy = proxyManager.getProxyForCurrentThread();
        
        // ⚡ ОПТИМИЗАЦИЯ: Используем общий Connection Manager вместо создания нового
        CloseableHttpClient httpClient = createHttpClientWithSharedPool(proxy);
        
        // Create factory
        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory(httpClient);
        
        return new RestTemplate(factory);
    }
    
    /**
     * ⚡ ОПТИМИЗАЦИЯ: Создаёт HTTP клиент с общим Connection Pool
     */
    private CloseableHttpClient createHttpClientWithSharedPool(ProxyServer proxy) {
        if (proxy == null || proxy.getHost() == null) {
            logger.debug("Thread {}: No proxy, using direct connection with shared pool", 
                Thread.currentThread().getName());
            return createDirectHttpClientWithSharedPool();
        }
        
        logger.debug("Thread {}: Using proxy {} with shared pool", 
            Thread.currentThread().getName(), proxy.getHost());
        
        // Configure proxy
        HttpHost proxyHost = new HttpHost(proxy.getHost(), proxy.getPort());
        
        // ⚡ ОПТИМИЗАЦИЯ: Агрессивные таймауты для быстрой загрузки изображений (как в Python)
        RequestConfig config = RequestConfig.custom()
                .setConnectTimeout(Timeout.ofSeconds(2))    // 5s → 2s: прокси должны отвечать быстро
                .setResponseTimeout(Timeout.ofSeconds(8))   // 15s → 8s: изображения небольшие
                .setProxy(proxyHost)
                .build();
        
        // ⚡ КРИТИЧНО: Используем ОБЩИЙ Connection Manager для всех прокси
        return HttpClients.custom()
                .setDefaultRequestConfig(config)
                .setConnectionManager(sharedConnectionManager)  // ← ОБЩИЙ ПУЛ!
                .build();
    }
    
    private CloseableHttpClient createDirectHttpClientWithSharedPool() {
        // ⚡ ОПТИМИЗАЦИЯ: Агрессивные таймауты для быстрой загрузки (как в Python)
        RequestConfig config = RequestConfig.custom()
                .setConnectTimeout(Timeout.ofSeconds(2))    // 5s → 2s
                .setResponseTimeout(Timeout.ofSeconds(8))   // 15s → 8s
                .build();
        
        // ⚡ КРИТИЧНО: Используем ОБЩИЙ Connection Manager
        return HttpClients.custom()
                .setDefaultRequestConfig(config)
                .setConnectionManager(sharedConnectionManager)  // ← ОБЩИЙ ПУЛ!
                .build();
    }
    
    /**
     * @deprecated Старый метод без shared pool - не используется
     */
    @Deprecated
    private CloseableHttpClient createHttpClientWithProxy(ProxyServer proxy) {
        if (proxy == null || proxy.getHost() == null) {
            logger.warn("No proxy available, using direct connection");
            return createDirectHttpClient();
        }
        
        logger.debug("Creating HTTP client with proxy: {}:{}", proxy.getHost(), proxy.getPort());
        
        // Configure proxy
        HttpHost proxyHost = new HttpHost(proxy.getHost(), proxy.getPort());
        
        // ⚡ ОПТИМИЗАЦИЯ: Агрессивные таймауты для быстрой загрузки изображений
        RequestConfig config = RequestConfig.custom()
                .setConnectTimeout(Timeout.ofSeconds(5))       // Уменьшено с 10s до 5s
                .setResponseTimeout(Timeout.ofSeconds(15))     // Уменьшено с 30s до 15s
                .setProxy(proxyHost)
                .build();
        
        // ⚡ ОПТИМИЗАЦИЯ: Увеличен connection pool для высокой параллельности
        PoolingHttpClientConnectionManager connectionManager = new PoolingHttpClientConnectionManager();
        connectionManager.setMaxTotal(200);           // Увеличено со 100 до 200
        connectionManager.setDefaultMaxPerRoute(50);  // Увеличено с 20 до 50
        
        return HttpClients.custom()
                .setDefaultRequestConfig(config)
                .setConnectionManager(connectionManager)
                .build();
    }
    
    private CloseableHttpClient createDirectHttpClient() {
        // ⚡ ОПТИМИЗАЦИЯ: Агрессивные таймауты для быстрой загрузки
        RequestConfig config = RequestConfig.custom()
                .setConnectTimeout(Timeout.ofSeconds(5))       // Уменьшено с 10s до 5s
                .setResponseTimeout(Timeout.ofSeconds(15))     // Уменьшено с 30s до 15s
                .build();
        
        // ⚡ ОПТИМИЗАЦИЯ: Увеличен connection pool для высокой параллельности
        PoolingHttpClientConnectionManager connectionManager = new PoolingHttpClientConnectionManager();
        connectionManager.setMaxTotal(200);           // Увеличено со 100 до 200
        connectionManager.setDefaultMaxPerRoute(50);  // Увеличено с 20 до 50
        
        return HttpClients.custom()
                .setDefaultRequestConfig(config)
                .setConnectionManager(connectionManager)
                .build();
    }

}

