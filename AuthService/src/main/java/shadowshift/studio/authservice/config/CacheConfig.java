package shadowshift.studio.authservice.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Конфигурация кэширования для AuthService.
 * Использует Caffeine для локального кэширования прогресса чтения.
 *
 * @author ShadowShiftStudio
 */
@Configuration
@EnableCaching
public class CacheConfig {

    /**
     * Создает менеджер кэша на основе Caffeine.
     * Настроен для кэширования прогресса чтения пользователей.
     *
     * @return CacheManager для управления кэшем
     */
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();

        // Настройка кэша для прогресса чтения
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .initialCapacity(500)
                .maximumSize(5000)
                .expireAfterWrite(Duration.ofMinutes(5))
                .weakKeys()
                .recordStats());

        return cacheManager;
    }
}
