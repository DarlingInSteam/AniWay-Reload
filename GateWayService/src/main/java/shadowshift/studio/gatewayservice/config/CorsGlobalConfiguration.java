package shadowshift.studio.gatewayservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.Collections;

@Configuration
public class CorsGlobalConfiguration {

    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration corsConfig = new CorsConfiguration();
        
        // Разрешенные origins patterns
        corsConfig.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:*",     // Все localhost порты
            "http://127.0.0.1:*",     // Все 127.0.0.1 порты
            "http://192.168.*.*:*",   // Локальная сеть 192.168.x.x
            "http://10.*.*.*:*",      // Локальная сеть 10.x.x.x
            "http://172.16.*.*:*",    // Частная сеть 172.16.x.x
            "http://172.17.*.*:*",    // Docker сеть 172.17.x.x
            "http://172.18.*.*:*",    // Docker сеть 172.18.x.x
            "http://*.*.*.*",         // Любые HTTP IP адреса
            "https://*.*.*.*",        // Любые HTTPS IP адреса  
            "http://*.yandexcloud.net", // Yandex Cloud
            "https://aniway.space",   // Основной домен HTTPS
            "http://aniway.space",    // Основной домен HTTP
            "https://www.aniway.space", // WWW HTTPS
            "http://www.aniway.space",  // WWW HTTP
            "http://84.201.152.162",  // Прямой IP HTTP
            "https://84.201.152.162", // Прямой IP HTTPS
            "https://*.yandexcloud.net" // Yandex Cloud HTTPS
        ));
        
        // Разрешенные методы
        corsConfig.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"));
        
        // Разрешенные заголовки
        corsConfig.setAllowedHeaders(Collections.singletonList("*"));
        
        // Включаем credentials
        corsConfig.setAllowCredentials(true);
        
        // Время кэширования предварительных запросов
        corsConfig.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfig);
        
        return new CorsWebFilter(source);
    }
}
