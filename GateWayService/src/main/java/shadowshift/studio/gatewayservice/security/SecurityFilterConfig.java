package shadowshift.studio.gatewayservice.security;

import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.server.WebFilter;

@Configuration
@EnableScheduling
public class SecurityFilterConfig {

    @Bean
    @ConditionalOnBean(RateLimitFilter.class)
    public WebFilter rateLimiter(RateLimitFilter rateLimitFilter) {
        return rateLimitFilter;
    }

    @Bean
    public WebFilter jwtFilter(JwtAuthFilter jwtAuthFilter) {
        return jwtAuthFilter;
    }
}
