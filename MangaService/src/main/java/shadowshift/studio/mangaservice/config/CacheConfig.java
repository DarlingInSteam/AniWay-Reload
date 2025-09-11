package shadowshift.studio.mangaservice.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/**
 * Конфигурация кэширования для MangaService.
 * Использует Caffeine для локального кэширования с учетом будущей интеграции Redis.
 *
 * @author ShadowShiftStudio
 */
@Configuration
@EnableCaching
public class CacheConfig {

    /**
     * Создает менеджер кэша на основе Caffeine.
     * Настроен для оптимальной производительности с учетом нагрузки на сервис.
     *
     * @return CacheManager для управления кэшем
     */
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager(
            "mangaCatalog", "mangaSearch", "mangaDetails", "mangaChapters", "userMangaView"
        );

        // Настройка кэша для списка манг (каталог)
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .initialCapacity(100)
                .maximumSize(1000)
                .expireAfterWrite(Duration.ofMinutes(10))
                .weakKeys()
                .recordStats());

        return cacheManager;
    }
}
