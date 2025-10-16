package shadowshift.studio.parserservice.config;

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
        
        // Create HTTP client with proxy
        CloseableHttpClient httpClient = createHttpClientWithProxy(proxy);
        
        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory(httpClient);
        
        return new RestTemplate(factory);
    }
    
    /**
     * Создаёт HTTP клиент с указанным прокси
     */
    private CloseableHttpClient createHttpClientWithProxy(ProxyServer proxy) {
        if (proxy == null || proxy.getHost() == null) {
            logger.warn("No proxy available, using direct connection");
            return createDirectHttpClient();
        }
        
        logger.debug("Creating HTTP client with proxy: {}:{}", proxy.getHost(), proxy.getPort());
        
        // Configure proxy
        HttpHost proxyHost = new HttpHost(proxy.getHost(), proxy.getPort());
        
        // Configure timeouts
        RequestConfig config = RequestConfig.custom()
                .setConnectTimeout(Timeout.ofSeconds(30))
                .setResponseTimeout(Timeout.ofSeconds(60))
                .setProxy(proxyHost)
                .build();
        
        // Configure proxy authentication if credentials provided
        if (proxy.getUsername() != null && !proxy.getUsername().isEmpty()) {
            BasicCredentialsProvider credentialsProvider = new BasicCredentialsProvider();
            // Use null host/port in AuthScope to match any proxy (preemptive authentication)
            credentialsProvider.setCredentials(
                new AuthScope(null, null, -1, null, null),
                new UsernamePasswordCredentials(
                    proxy.getUsername(), 
                    proxy.getPassword() != null ? proxy.getPassword().toCharArray() : new char[0]
                )
            );
            
            return HttpClients.custom()
                    .setDefaultRequestConfig(config)
                    .setDefaultCredentialsProvider(credentialsProvider)
                    .setConnectionManager(new PoolingHttpClientConnectionManager())
                    .build();
        }
        
        // No authentication
        return HttpClients.custom()
                .setDefaultRequestConfig(config)
                .setConnectionManager(new PoolingHttpClientConnectionManager())
                .build();
    }
    
    private CloseableHttpClient createDirectHttpClient() {
        RequestConfig config = RequestConfig.custom()
                .setConnectTimeout(Timeout.ofSeconds(30))
                .setResponseTimeout(Timeout.ofSeconds(60))
                .build();
        
        return HttpClients.custom()
                .setDefaultRequestConfig(config)
                .setConnectionManager(new PoolingHttpClientConnectionManager())
                .build();
    }
}

