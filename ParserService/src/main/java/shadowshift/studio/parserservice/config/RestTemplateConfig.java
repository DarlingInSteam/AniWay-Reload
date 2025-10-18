package shadowshift.studio.parserservice.config;

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

    /**
     * Создаёт RestTemplate с автоматической ротацией прокси
     * Каждый запрос будет использовать новый прокси из пула
     */
    @Bean
    @Primary
    @Scope("prototype")
    public RestTemplate restTemplate() {
        // Get next proxy from pool
        ProxyServer proxy = proxyManager.getNextProxy();
        
        // Create HTTP client with proxy (IP-based auth, no credentials needed)
        CloseableHttpClient httpClient = createHttpClientWithProxy(proxy);
        
        // Create factory
        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory(httpClient);
        
        return new RestTemplate(factory);
    }
    
    /**
     * Создаёт HTTP клиент с указанным прокси (IP-based authentication)
     */
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

