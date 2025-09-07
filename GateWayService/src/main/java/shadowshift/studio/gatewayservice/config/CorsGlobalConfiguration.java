package shadowshift.studio.gatewayservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.Collections;

/**
 * Глобальная конфигурация CORS (Cross-Origin Resource Sharing) для Gateway Service.
 * Настраивает политику CORS для всех входящих HTTP запросов, позволяя
 * безопасное взаимодействие между браузерными приложениями и API.
 *
 * @author ShadowShiftStudio
 */
@Configuration
public class CorsGlobalConfiguration {

    /**
     * Создает и настраивает глобальный фильтр CORS для всех эндпоинтов.
     * Конфигурирует разрешенные источники, методы, заголовки и другие параметры CORS.
     *
     * @return CorsWebFilter настроенный фильтр CORS
     */
    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration corsConfig = new CorsConfiguration();

        corsConfig.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:*",
            "http://127.0.0.1:*",
            "http://192.168.*.*:*",
            "http://10.*.*.*:*",
            "http://172.16.*.*:*",
            "http://172.17.*.*:*",
            "http://172.18.*.*:*",
            "http://*.*.*.*",
            "https://*.*.*.*",
            "http://*.yandexcloud.net",
            "https://aniway.space",
            "http://aniway.space",
            "https://www.aniway.space",
            "http://www.aniway.space",
            "http://84.201.152.162",
            "https://84.201.152.162",
            "https://*.yandexcloud.net"
        ));

        corsConfig.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"));

        corsConfig.setAllowedHeaders(Collections.singletonList("*"));

        corsConfig.setAllowCredentials(true);

        corsConfig.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfig);

        return new CorsWebFilter(source);
    }
}
