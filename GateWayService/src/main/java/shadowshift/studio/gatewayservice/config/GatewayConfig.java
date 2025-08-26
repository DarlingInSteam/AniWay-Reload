package shadowshift.studio.gatewayservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.Collections;

/**
 * Конфигурация Gateway для настройки CORS и других аспектов безопасности.
 *
 * Этот класс дополняет YAML конфигурацию и обеспечивает более гибкую
 * настройку CORS политики для различных типов запросов.
 *
 * @author AniWay Development Team
 * @version 1.0.0
 */
@Configuration
public class GatewayConfig {

    /**
     * Дополнительная настройка CORS фильтра для более детального контроля.
     *
     * Этот бин дополняет глобальную CORS конфигурацию из application.yml
     * и обеспечивает правильную обработку preflight запросов.
     */
    @Bean
    public CorsWebFilter corsWebFilter() {
        CorsConfiguration corsConfig = new CorsConfiguration();

        // Разрешенные origins для различных сред
        corsConfig.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:*",     // Локальная разработка
            "http://127.0.0.1:*",     // Альтернативный localhost
            "https://*.vercel.app",   // Vercel деплой
            "https://*.netlify.app",  // Netlify деплой
            "https://*.github.io"     // GitHub Pages
        ));

        // Разрешенные HTTP методы
        corsConfig.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"
        ));

        // Разрешенные заголовки
        corsConfig.setAllowedHeaders(Collections.singletonList("*"));

        // Разрешаем отправку credentials (cookies, authorization headers)
        corsConfig.setAllowCredentials(true);

        // Время кэширования preflight запросов (в секундах)
        corsConfig.setMaxAge(3600L);

        // Заголовки, которые клиент может читать из ответа
        corsConfig.setExposedHeaders(Arrays.asList(
            "Content-Type", "Content-Length", "Authorization",
            "X-Requested-With", "X-Total-Count"
        ));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfig);

        return new CorsWebFilter(source);
    }
}
