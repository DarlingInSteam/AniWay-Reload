package shadowshift.studio.parserservice.config;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.apache.hc.client5.http.auth.AuthScope;
import org.apache.hc.client5.http.auth.UsernamePasswordCredentials;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.auth.BasicCredentialsProvider;
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
    sharedConnectionManager.setMaxTotal(200);          // 10 прокси × 20 соединений (запас под ~1 Gbit/s)
    sharedConnectionManager.setDefaultMaxPerRoute(20); // 20 соединений на прокси для 100 Mbit/s каналов
        
    logger.info("✅ Connection Pool создан: MaxTotal=200, MaxPerRoute=20 (под 10 быстрых прокси и 2 главы параллельно)");
    }
    
    @PreDestroy
    public void closeConnectionPool() {
        if (sharedConnectionManager != null) {
            logger.info("🔒 Закрытие общего Connection Pool...");
            sharedConnectionManager.close();
        }
    }

    /**
     * 🌍 Создаёт RestTemplate для всех запросов (API + изображения)
     * Используется единый пул быстрых финских прокси для всего
     */
    @Bean
    @Primary
    @Scope("prototype")
    public RestTemplate restTemplate() {
        // 🌍 Получаем прокси через sticky assignment для максимального переиспользования соединений
        ProxyServer proxy = proxyManager.getProxyForCurrentThread();
        
        CloseableHttpClient httpClient;
        if (proxy != null) {
            logger.debug("Thread {}: Using Finnish proxy {} (sticky)", 
                Thread.currentThread().getName(), proxy.getHost());
            httpClient = createHttpClientWithSharedPool(proxy);
        } else {
            logger.debug("Thread {}: No proxy available, using direct connection", 
                Thread.currentThread().getName());
            httpClient = createDirectHttpClientWithSharedPool();
        }
        
        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory(httpClient);
        return new RestTemplate(factory);
    }
    
    /**
     * 🔓 RestTemplate БЕЗ прокси для API запросов MangaLib
     * Используется для metadata, chapters list и chapter slides
     * (прокси блокируются MangaLib API с HTTP 500)
     */
    @Bean("apiRestTemplate")
    @Scope("prototype")
    public RestTemplate apiRestTemplate() {
        logger.debug("Thread {}: Creating API RestTemplate WITHOUT proxy", 
            Thread.currentThread().getName());
        
        CloseableHttpClient httpClient = createDirectHttpClientWithSharedPool();
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
        
        // ⚡ КРИТИЧНО: Настройка аутентификации для прокси
        BasicCredentialsProvider credentialsProvider = null;
        if (proxy.getUsername() != null && proxy.getPassword() != null) {
            credentialsProvider = new BasicCredentialsProvider();
            credentialsProvider.setCredentials(
                new AuthScope(proxy.getHost(), proxy.getPort()),
                new UsernamePasswordCredentials(proxy.getUsername(), proxy.getPassword().toCharArray())
            );
            logger.debug("Thread {}: Proxy authentication configured for {}", 
                Thread.currentThread().getName(), proxy.getHost());
        }
        
        // ⚡ ОПТИМИЗАЦИЯ: Агрессивные таймауты для быстрой загрузки изображений (как в Python)
        RequestConfig config = RequestConfig.custom()
                .setConnectTimeout(Timeout.ofSeconds(2))    // 5s → 2s: прокси должны отвечать быстро
                .setResponseTimeout(Timeout.ofSeconds(8))   // 15s → 8s: изображения небольшие
                .setProxy(proxyHost)
                .build();
        
        // ⚡ КРИТИЧНО: Используем ОБЩИЙ Connection Manager для всех прокси
        var httpClientBuilder = HttpClients.custom()
                .setDefaultRequestConfig(config)
                .setConnectionManager(sharedConnectionManager);  // ← ОБЩИЙ ПУЛ!
        
        if (credentialsProvider != null) {
            httpClientBuilder.setDefaultCredentialsProvider(credentialsProvider);
        }
        
        return httpClientBuilder.build();
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

}

