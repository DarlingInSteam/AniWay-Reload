package shadowshift.studio.authservice.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;
import shadowshift.studio.authservice.service.UserService;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {
    
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserService userService;
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }
    
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http, CorsConfigurationSource corsConfigurationSource) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .authorizeHttpRequests(auth -> auth
            .requestMatchers("/api/auth/login", "/api/auth/register", "/api/auth/email/request-code", "/api/auth/email/verify-code",
                "/api/auth/password/reset/request-code", "/api/auth/password/reset/verify-code", "/api/auth/password/reset/perform").permitAll()
            .requestMatchers("/api/auth/account/delete/request-code", "/api/auth/account/delete/verify-code", "/api/auth/account/delete/perform", "/api/auth/password/change").authenticated()
                        .requestMatchers("/actuator/**").permitAll()
                        .requestMatchers("/internal/bookmarks/manga/*/subscribers").permitAll()
                        .requestMatchers("/api/admin/bookmarks/cleanup-orphaned").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/reviews/manga/*/rating").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/reviews/manga/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/users/search").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/users/*/public").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/bookmarks/user/*").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .anyRequest().authenticated()
                )
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(exception -> exception.authenticationEntryPoint(jwtAuthenticationEntryPoint));
        
        return http.build();
    }
}
