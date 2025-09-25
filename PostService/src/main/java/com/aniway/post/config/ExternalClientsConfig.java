package com.aniway.post.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class ExternalClientsConfig {

    @Bean
    public WebClient imageStorageWebClient(@Value("${image-storage.url:http://image-storage-service:8083}") String baseUrl, WebClient.Builder builder) {
        return builder.baseUrl(baseUrl).build();
    }
}
