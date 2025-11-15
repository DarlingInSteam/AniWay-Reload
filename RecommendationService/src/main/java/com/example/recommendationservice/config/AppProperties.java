package com.example.recommendationservice.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

/**
 * Конфигурация для обращения к другим сервисам через Gateway.
 */
@Data
@Configuration
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private Gateway gateway = new Gateway();
    private Services services = new Services();

    @Data
    public static class Gateway {
        private String url = "http://gateway-service:8080";
    }

    @Data
    public static class Services {
        private ServiceConfig manga = new ServiceConfig();
        private ServiceConfig auth = new ServiceConfig();
    }

    @Data
    public static class ServiceConfig {
        private String basePath;
    }
}

