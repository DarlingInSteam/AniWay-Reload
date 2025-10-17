package shadowshift.studio.parserservice.service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Collections;

import org.apache.hc.client5.http.auth.AuthScope;
import org.apache.hc.client5.http.auth.UsernamePasswordCredentials;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.auth.BasicCredentialsProvider;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.apache.hc.core5.http.HttpHost;
import org.apache.hc.core5.http.message.BasicHeader;
import org.apache.hc.core5.util.Timeout;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import shadowshift.studio.parserservice.service.ProxyManagerService.ProxyServer;

/**
 * Сервис для выполнения HTTP запросов с автоматической ротацией прокси
 */
@Service
public class ProxyRotatingRestTemplateService {
    
    private static final Logger logger = LoggerFactory.getLogger(ProxyRotatingRestTemplateService.class);
    private static final int MAX_RETRIES = 5;
    
    private final ProxyManagerService proxyManager;
    
    public ProxyRotatingRestTemplateService(ProxyManagerService proxyManager) {
        this.proxyManager = proxyManager;
    }
    
    /**
     * Выполняет GET запрос с автоматической ротацией прокси при ошибках
     */
    public <T> ResponseEntity<T> exchange(String url, HttpMethod method, HttpEntity<?> requestEntity, 
                                          Class<T> responseType) {
        int attempt = 0;
        RestClientException lastException = null;
        
        while (attempt < MAX_RETRIES) {
            ProxyServer proxy = proxyManager.getNextProxy();
            
            if (proxy == null) {
                throw new RuntimeException("No proxy available for request");
            }
            
            try {
                logger.debug("Попытка {} из {}, прокси: {}:{}", 
                        attempt + 1, MAX_RETRIES, proxy.getHost(), proxy.getPort());
                
                RestTemplate restTemplate = createRestTemplateWithProxy(proxy);
                ResponseEntity<T> response = restTemplate.exchange(url, method, requestEntity, responseType);
                
                // Успешный запрос
                logger.debug("Запрос успешно выполнен через прокси {}:{}", 
                        proxy.getHost(), proxy.getPort());
                return response;
                
            } catch (RestClientException e) {
                lastException = e;
                logger.warn("Ошибка запроса через прокси {}:{} - {}", 
                        proxy.getHost(), proxy.getPort(), e.getMessage());
                
                // Отмечаем прокси как проблемный
                proxyManager.reportProxyFailure(proxy);
                
                attempt++;
                
                if (attempt >= MAX_RETRIES) {
                    logger.error("Не удалось выполнить запрос после {} попыток", MAX_RETRIES);
                    throw new RuntimeException("Failed to execute request after " + MAX_RETRIES + " attempts", e);
                }
                
                // Пауза перед следующей попыткой
                try {
                    Thread.sleep(500);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    throw new RuntimeException("Request interrupted", ie);
                }
            }
        }
        
        throw new RuntimeException("Failed to execute request after " + MAX_RETRIES + " attempts", lastException);
    }
    
    /**
     * Создаёт RestTemplate с указанным прокси
     */
    private RestTemplate createRestTemplateWithProxy(ProxyServer proxy) {
        CloseableHttpClient httpClient = createHttpClientWithProxy(proxy);
        HttpComponentsClientHttpRequestFactory factory = new HttpComponentsClientHttpRequestFactory(httpClient);
        return new RestTemplate(factory);
    }
    
    /**
     * Создаёт HTTP клиент с настройками прокси
     */
    private CloseableHttpClient createHttpClientWithProxy(ProxyServer proxy) {
        HttpHost proxyHost = new HttpHost(proxy.getHost(), proxy.getPort());
        
        RequestConfig config = RequestConfig.custom()
                .setConnectTimeout(Timeout.ofSeconds(30))
                .setResponseTimeout(Timeout.ofSeconds(60))
                .setProxy(proxyHost)
                .build();
        
        if (proxy.getUsername() != null && !proxy.getUsername().isEmpty()) {
            BasicCredentialsProvider credentialsProvider = new BasicCredentialsProvider();
            String password = proxy.getPassword() != null ? proxy.getPassword() : "";
            UsernamePasswordCredentials credentials = new UsernamePasswordCredentials(
                    proxy.getUsername(), password.toCharArray());
            credentialsProvider.setCredentials(new AuthScope(proxy.getHost(), proxy.getPort()), credentials);

            String encodedCredentials = Base64.getEncoder()
                    .encodeToString((proxy.getUsername() + ":" + password)
                            .getBytes(StandardCharsets.UTF_8));
        return HttpClients.custom()
            .setDefaultRequestConfig(config)
            .setDefaultCredentialsProvider(credentialsProvider)
            .setConnectionManager(new PoolingHttpClientConnectionManager())
            .setDefaultHeaders(Collections.singletonList(
                new BasicHeader("Proxy-Authorization", "Basic " + encodedCredentials)))
            .build();
        }
        
        return HttpClients.custom()
                .setDefaultRequestConfig(config)
                .setConnectionManager(new PoolingHttpClientConnectionManager())
                .build();
    }

}
