package shadowshift.studio.forumservice.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import shadowshift.studio.forumservice.security.GatewayAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    // TODO: Добавить JwtAuthenticationFilter когда он будет создан

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                // Публичные endpoint'ы (чтение без авторизации)
                .requestMatchers("/api/forum/categories").permitAll()
                .requestMatchers("/api/forum/categories/*").permitAll()
                .requestMatchers("/api/forum/categories/search").permitAll()
                .requestMatchers("/api/forum/threads").permitAll()
                .requestMatchers("/api/forum/threads/*").permitAll()
                .requestMatchers("/api/forum/threads/search").permitAll()
                .requestMatchers("/api/forum/threads/author/*").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/forum/threads/*/posts").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/forum/threads/*/posts/tree").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/forum/manga/*/threads").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/forum/manga/*/threads/**").permitAll()
                // Лидеры
                .requestMatchers(HttpMethod.GET, "/api/forum/tops/threads").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/forum/tops/posts").permitAll()
                
                // Административные endpoint'ы
                .requestMatchers("/api/forum/categories/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/forum/categories").hasRole("ADMIN") // POST
                .requestMatchers("/api/forum/categories/*").hasRole("ADMIN") // PUT, DELETE
                
                // Модераторские endpoint'ы
                .requestMatchers("/api/forum/threads/*/pin").hasAnyRole("MODERATOR", "ADMIN")
                .requestMatchers("/api/forum/threads/*/lock").hasAnyRole("MODERATOR", "ADMIN")
                
                // Endpoint'ы для авторизованных пользователей
                .requestMatchers("/api/forum/threads").hasRole("USER") // POST - создание темы
                .requestMatchers("/api/forum/threads/*").hasRole("USER") // PUT, DELETE
                .requestMatchers("/api/forum/threads/*/subscribe").hasRole("USER")
                .requestMatchers(HttpMethod.POST, "/api/forum/threads/*/posts").hasRole("USER") // создание поста
                .requestMatchers("/api/forum/posts/*").hasRole("USER") // PUT, DELETE
                // Реакции
                .requestMatchers("/api/forum/threads/*/reactions").hasRole("USER")
                .requestMatchers("/api/forum/posts/*/reactions").hasRole("USER")
                .requestMatchers(HttpMethod.POST, "/api/forum/threads/**").hasRole("USER")
                .requestMatchers(HttpMethod.POST, "/api/forum/manga/*/threads").hasRole("USER")
                
                // Actuator endpoint'ы
                .requestMatchers("/actuator/health", "/actuator/prometheus").permitAll()
                .requestMatchers("/actuator/**").hasRole("ADMIN")
                
                // Все остальные требуют аутентификации
                .anyRequest().authenticated()
            );

    // Аутентификация обеспечивается Gateway: добавляем фильтр, читающий X-User-* заголовки
    http.addFilterBefore(new GatewayAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Разрешенные домены (в production указать конкретные домены)
        configuration.setAllowedOriginPatterns(List.of("*"));
        
        // Разрешенные HTTP методы
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        
        // Разрешенные заголовки
        configuration.setAllowedHeaders(List.of("*"));
        
        // Разрешить отправку cookies
        configuration.setAllowCredentials(true);
        
        // Заголовки, которые клиент может читать
        configuration.setExposedHeaders(List.of("Authorization", "X-Total-Count"));
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        
        return source;
    }
}