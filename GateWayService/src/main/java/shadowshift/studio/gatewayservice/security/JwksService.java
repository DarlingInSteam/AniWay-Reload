package shadowshift.studio.gatewayservice.security;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.util.DefaultResourceRetriever;
import com.nimbusds.jose.util.Resource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.net.URL;
import java.text.ParseException;
import java.time.Duration;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Простая служба для загрузки JWKS и кеширования.
 */
@Component
public class JwksService {

    private static final Logger logger = LoggerFactory.getLogger(JwksService.class);

    private final AtomicReference<JWKSet> cached = new AtomicReference<>();
    private final DefaultResourceRetriever retriever = new DefaultResourceRetriever((int) Duration.ofSeconds(5).toMillis(), (int) Duration.ofSeconds(10).toMillis());

    @Value("${auth.jwks-url:}")
    private String jwksUrlProp;

    private URL jwksUrl;

    @PostConstruct
    public void init() {
        if (jwksUrlProp == null || jwksUrlProp.isBlank()) {
            logger.warn("No auth.jwks-url configured; JWKS validation disabled");
            return;
        }
        try {
            this.jwksUrl = new URL(jwksUrlProp);
            refresh();
        } catch (IOException e) {
            logger.error("Failed to initialize JWKS service: {}", e.getMessage());
        }
    }

    public JWKSet getJwkSet() {
        return cached.get();
    }

    public synchronized void refresh() {
        if (jwksUrl == null) return;
        try {
            Resource resource = retriever.retrieveResource(jwksUrl);
            String json = resource.getContent();
            JWKSet set = JWKSet.parse(json);
            cached.set(set);
            logger.info("JWKS refreshed, keys={}", set.getKeys().size());
        } catch (IOException | ParseException e) {
            logger.warn("Failed to refresh JWKS: {}", e.getMessage());
        }
    }

    // периодический рефреш каждые 5 минут
    @Scheduled(fixedDelayString = "PT5M")
    public void scheduledRefresh() {
        refresh();
    }
}
