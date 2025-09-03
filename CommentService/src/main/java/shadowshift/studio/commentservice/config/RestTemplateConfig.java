package shadowshift.studio.commentservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * Конфигурация для HTTP клиентов
 */
@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate() {
        RestTemplate restTemplate = new RestTemplate();

        // Настраиваем таймауты для работы с внешними сервисами
        ClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        ((SimpleClientHttpRequestFactory) requestFactory).setConnectTimeout(30000); // 30 секунд
        ((SimpleClientHttpRequestFactory) requestFactory).setReadTimeout(60000);    // 60 секунд

        restTemplate.setRequestFactory(requestFactory);
        return restTemplate;
    }
}
