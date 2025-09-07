package shadowshift.studio.gatewayservice.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class AuthProperties {

    @Value("${auth.introspect-url:http://auth-service:8085/api/auth/validate}")
    private String introspectUrl;

    @Value("${auth.public-paths:/api/auth/**,/api/health/**, /api/public/**}")
    private String publicPathsRaw;

    @Value("${auth.cache-ttl-seconds:300}")
    private long cacheTtlSeconds;

    private List<String> publicPaths;

    @PostConstruct
    public void init() {
        publicPaths = Arrays.stream(publicPathsRaw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    public String getIntrospectUrl() {
        return introspectUrl;
    }

    public List<String> getPublicPaths() {
        return publicPaths;
    }

    public long getCacheTtlSeconds() {
        return cacheTtlSeconds;
    }
}
