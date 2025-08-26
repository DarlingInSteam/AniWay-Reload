package shadowshift.studio.mangaservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;

@Configuration
public class AppConfig {

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
