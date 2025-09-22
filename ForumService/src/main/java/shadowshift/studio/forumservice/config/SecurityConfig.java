package shadowshift.studio.forumservice.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
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
                .requestMatchers("/api/forum/categories/{categoryId}").permitAll()
                .requestMatchers("/api/forum/categories/search").permitAll()
                .requestMatchers("/api/forum/threads").permitAll()
                .requestMatchers("/api/forum/threads/{threadId}").permitAll()
                .requestMatchers("/api/forum/threads/search").permitAll()
                .requestMatchers("/api/forum/threads/author/{authorId}").permitAll()
                .requestMatchers("/api/forum/threads/{threadId}/posts").permitAll()
                
                // Административные endpoint'ы
                .requestMatchers("/api/forum/categories/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/forum/categories").hasRole("ADMIN") // POST
                .requestMatchers("/api/forum/categories/{categoryId}").hasRole("ADMIN") // PUT, DELETE
                
                // Модераторские endpoint'ы
                .requestMatchers("/api/forum/threads/{threadId}/pin").hasAnyRole("MODERATOR", "ADMIN")
                .requestMatchers("/api/forum/threads/{threadId}/lock").hasAnyRole("MODERATOR", "ADMIN")
                
                // Endpoint'ы для авторизованных пользователей
                .requestMatchers("/api/forum/threads").hasRole("USER") // POST - создание темы
                .requestMatchers("/api/forum/threads/{threadId}").hasRole("USER") // PUT, DELETE
                .requestMatchers("/api/forum/threads/{threadId}/subscribe").hasRole("USER")
                .requestMatchers("/api/forum/threads/{threadId}/posts").hasRole("USER") // POST - создание поста
                .requestMatchers("/api/forum/posts/{postId}").hasRole("USER") // PUT, DELETE
                .requestMatchers("/api/forum/**/like").hasRole("USER")
                .requestMatchers("/api/forum/**/dislike").hasRole("USER")
                .requestMatchers("/api/forum/**/reaction").hasRole("USER")
                
                // Actuator endpoint'ы
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/actuator/**").hasRole("ADMIN")
                
                // Все остальные требуют аутентификации
                .anyRequest().authenticated()
            );

        // TODO: Добавить JWT фильтр
        // http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

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