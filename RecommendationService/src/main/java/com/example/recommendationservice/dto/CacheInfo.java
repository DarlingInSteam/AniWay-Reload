package com.example.recommendationservice.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Информация о кеше.
 */
@Data
@Builder
public class CacheInfo {
    private final String name;
    private final long estimatedSize; // приблизительный размер кеша
    private final long hitCount; // количество попаданий в кеш
    private final long missCount; // количество промахов кеша
    private final double hitRate; // коэффициент попаданий
    private final long evictionCount; // количество удалений из кеша
    private final long loadCount;
    private final double averageLoadTime;
}
