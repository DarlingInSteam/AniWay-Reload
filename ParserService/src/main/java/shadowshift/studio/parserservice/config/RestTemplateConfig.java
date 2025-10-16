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
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;
import shadowshift.studio.parserservice.service.ProxyManagerService;
import shadowshift.studio.parserservice.service.ProxyManagerService.ProxyServer;

@Configuration
public class RestTemplateConfig {
    
    private static final Logger logger = LoggerFactory.getLogger(RestTemplateConfig.class);

    @Autowired
    private ProxyManagerService proxyManager;

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        // Create HTTP client with proxy and authentication support
        CloseableHttpClient httpClient = createHttpClientWithProxy();
        
        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory(httpClient);
        
        return builder
                .requestFactory(() -> factory)
                .build();
    }
    
    private CloseableHttpClient createHttpClientWithProxy() {
        // Get proxy from manager
        ProxyConfig proxy = proxyManager.getNextProxy();
        
        if (proxy == null || proxy.getHost() == null) {
            logger.warn("No proxy available, using direct connection");
            return createDirectHttpClient();
        }
        
        logger.info("Using proxy: {}:{}", proxy.getHost(), proxy.getPort());
        
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
            credentialsProvider.setCredentials(
                new AuthScope(proxy.getHost(), proxy.getPort()),
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

