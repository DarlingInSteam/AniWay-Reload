package shadowshift.studio.gatewayservice.security;

import java.time.Duration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.ReactiveStringRedisTemplate;
import org.springframework.stereotype.Component;

import reactor.core.publisher.Mono;

/**
 * Thin wrapper over {@link ReactiveStringRedisTemplate} used to express intent and keep the
 * filter logic tidy.
 */
@Component
@ConditionalOnProperty(name = "ratelimit.enabled", havingValue = "true", matchIfMissing = true)
public class ReactiveRedisConnectionFacade {

    private final ReactiveStringRedisTemplate redisTemplate;

    public ReactiveRedisConnectionFacade(ReactiveStringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public Mono<Long> increment(String key) {
        return redisTemplate.opsForValue().increment(key);
    }

    public Mono<Long> decrement(String key) {
        return redisTemplate.opsForValue().decrement(key);
    }

    public Mono<Boolean> expire(String key, Duration ttl) {
        return redisTemplate.expire(key, ttl);
    }
}
