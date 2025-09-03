package shadowshift.studio.authservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Разрешаем все адреса для продакшена  
        configuration.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:*",
            "http://192.168.*.*:*",
            "http://10.*.*.*:*", 
            "http://172.16.*.*:*",
            "http://*.*.*.*",         // Любые HTTP IP адреса
            "https://*.*.*.*",        // Любые HTTPS IP адреса
            "http://*.yandexcloud.net", 
            "https://*.yandexcloud.net"
        ));
        
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }
}
