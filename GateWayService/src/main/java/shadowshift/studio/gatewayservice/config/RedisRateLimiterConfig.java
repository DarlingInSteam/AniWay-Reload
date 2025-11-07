package shadowshift.studio.gatewayservice.config;

import java.time.Duration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.data.redis.RedisProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

import io.github.bucket4j.distributed.ExpirationAfterWriteStrategy;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.codec.ByteArrayCodec;
import shadowshift.studio.gatewayservice.security.RateLimitProperties;

@Configuration
@ConditionalOnProperty(name = "ratelimit.enabled", havingValue = "true", matchIfMissing = true)
public class RedisRateLimiterConfig {

    @Bean(destroyMethod = "shutdown")
    public RedisClient bucketRedisClient(RedisProperties properties) {
        if (StringUtils.hasText(properties.getUrl())) {
            return RedisClient.create(properties.getUrl());
        }

        RedisURI uri = new RedisURI();
        uri.setHost(properties.getHost());
        uri.setPort(properties.getPort());
        uri.setDatabase(properties.getDatabase());
        Duration timeout = properties.getTimeout();
        if (timeout != null) {
            uri.setTimeout(timeout);
        }
        if (properties.getSsl().isEnabled()) {
            uri.setSsl(true);
        }
        if (StringUtils.hasText(properties.getUsername())) {
            uri.setUsername(properties.getUsername());
        }
        if (StringUtils.hasText(properties.getPassword())) {
            uri.setPassword(properties.getPassword().toCharArray());
        }
        return RedisClient.create(uri);
    }

    @Bean(destroyMethod = "close")
    public StatefulRedisConnection<byte[], byte[]> bucketRedisConnection(RedisClient redisClient) {
        return redisClient.connect(ByteArrayCodec.INSTANCE);
    }

    @Bean
    public ProxyManager<byte[]> bucketProxyManager(StatefulRedisConnection<byte[], byte[]> connection,
                                                   RateLimitProperties rateLimitProperties) {
        Duration fallbackTtl = determineFallbackTtl(rateLimitProperties);
        return LettuceBasedProxyManager.builderFor(connection)
                .withExpirationStrategy(ExpirationAfterWriteStrategy.basedOnTimeForRefillingBucketUpToMax(fallbackTtl))
                .build();
    }

    private Duration determineFallbackTtl(RateLimitProperties properties) {
    long anonSeconds = timeToFullRecoverySeconds(properties.getAnon().getBurst(), properties.getAnon().getRefillPerMinute());
    long userSeconds = timeToFullRecoverySeconds(properties.getUser().getBurst(), properties.getUser().getRefillPerMinute());
    long adminSeconds = timeToFullRecoverySeconds(properties.getAdmin().getBurst(), properties.getAdmin().getRefillPerMinute());

        long longestSeconds = Math.max(anonSeconds, Math.max(userSeconds, adminSeconds));
        long fallbackSeconds = Math.max(60, longestSeconds) + 60; // ensure state survives past refill boundary

        return Duration.ofSeconds(fallbackSeconds);
    }

    private long timeToFullRecoverySeconds(int burst, int refillPerMinute) {
        if (refillPerMinute <= 0) {
            return 60;
        }
        double minutesToRefill = (double) burst / (double) refillPerMinute;
        return (long) Math.ceil(minutesToRefill * 60);
    }
}
