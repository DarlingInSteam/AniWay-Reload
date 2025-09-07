package shadowshift.studio.gatewayservice.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.server.WebFilter;

@Configuration
@EnableScheduling
public class SecurityFilterConfig {

    private final RateLimitFilter rateLimitFilter;
    private final JwtAuthFilter jwtAuthFilter;

    public SecurityFilterConfig(RateLimitFilter rateLimitFilter, JwtAuthFilter jwtAuthFilter) {
        this.rateLimitFilter = rateLimitFilter;
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public WebFilter rateLimiter() {
        return rateLimitFilter;
    }

    @Bean
    public WebFilter jwtFilter() {
        return jwtAuthFilter;
    }
}
