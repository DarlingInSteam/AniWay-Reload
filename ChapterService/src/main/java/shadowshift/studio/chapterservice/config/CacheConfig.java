package shadowshift.studio.chapterservice.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Конфигурация кэширования для ChapterService.
 * Использует Caffeine для локального кэширования глав манги.
 *
 * @author ShadowShiftStudio
 */
@Configuration
@EnableCaching
public class CacheConfig {

    /**
     * Создает менеджер кэша на основе Caffeine.
     * Настроен для кэширования глав и их метаданных.
     *
     * @return CacheManager для управления кэшем
     */
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();

        // Настройка кэша для глав манги
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .initialCapacity(200)
                .maximumSize(2000)
                .expireAfterWrite(Duration.ofMinutes(15))
                .weakKeys()
                .recordStats());

        return cacheManager;
    }
}
