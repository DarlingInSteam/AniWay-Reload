package com.example.recommendationservice.service;

import com.example.recommendationservice.dto.MangaMetadataDto;
import com.example.recommendationservice.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

/**
 * Сервис для работы с кешированными данными манги.
 * Использует Caffeine для кеширования полных данных из MangaService через Gateway.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MangaDataService {

    private final RestTemplate restTemplate;
    private final AppProperties appProperties;

    /**
     * Получить метаданные манги с кешированием.
     * Данные кешируются на 1 час с обновлением каждые 30 минут.
     */
    @Cacheable(value = "mangaMetadata", key = "#mangaId")
    public MangaMetadataDto getMangaMetadata(Long mangaId) {
        try {
            log.debug("Fetching manga metadata from MangaService via Gateway for mangaId: {}", mangaId);
            
            // Формируем URL через Gateway
            String gatewayUrl = appProperties.getGateway().getUrl();
            String mangaBasePath = appProperties.getServices().getManga().getBasePath();
            String url = gatewayUrl + mangaBasePath + "/" + mangaId + "/metadata";
            
            log.debug("Requesting manga metadata from URL: {}", url);
            
            MangaMetadataDto metadata = restTemplate.getForObject(url, MangaMetadataDto.class);
            
            if (metadata != null) {
                metadata.setUpdatedAt(LocalDateTime.now());
                log.debug("Successfully fetched and cached manga metadata for mangaId: {}", mangaId);
            } else {
                log.warn("No metadata found for mangaId: {}", mangaId);
            }
            
            return metadata;
            
        } catch (RestClientException e) {
            log.error("Error fetching manga metadata for mangaId: {} - {}", mangaId, e.getMessage());
            // Возвращаем базовую DTO с минимальной информацией
            return createFallbackMetadata(mangaId);
        } catch (Exception e) {
            log.error("Unexpected error fetching manga metadata for mangaId: {}", mangaId, e);
            return createFallbackMetadata(mangaId);
        }
    }

    /**
     * Получить основную информацию о манге (title, genres, tags) для рекомендательной системы.
     */
    @Cacheable(value = "mangaMetadata", key = "'basic_' + #mangaId")
    public MangaMetadataDto getBasicMangaInfo(Long mangaId) {
        try {
            log.debug("Fetching basic manga info from MangaService via Gateway for mangaId: {}", mangaId);
            
            // Формируем URL для получения базовой информации о манге
            String gatewayUrl = appProperties.getGateway().getUrl();
            String mangaBasePath = appProperties.getServices().getManga().getBasePath();
            String url = gatewayUrl + mangaBasePath + "/" + mangaId;
            
            log.debug("Requesting basic manga info from URL: {}", url);
            
            // Предполагаем, что MangaService возвращает объект с нужными полями
            // Если структура ответа отличается, может потребоваться создать отдельный DTO
            MangaMetadataDto metadata = restTemplate.getForObject(url, MangaMetadataDto.class);
            
            if (metadata != null) {
                metadata.setUpdatedAt(LocalDateTime.now());
                log.debug("Successfully fetched basic manga info for mangaId: {}", mangaId);
            } else {
                log.warn("No basic manga info found for mangaId: {}", mangaId);
                return createFallbackMetadata(mangaId);
            }
            
            return metadata;
            
        } catch (RestClientException e) {
            log.error("Error fetching basic manga info for mangaId: {} - {}", mangaId, e.getMessage());
            return createFallbackMetadata(mangaId);
        } catch (Exception e) {
            log.error("Unexpected error fetching basic manga info for mangaId: {}", mangaId, e);
            return createFallbackMetadata(mangaId);
        }
    }

    /**
     * Получить метаданные нескольких манг с кешированием.
     */
    public List<MangaMetadataDto> getMangaMetadataBatch(List<Long> mangaIds) {
        log.debug("Fetching metadata for {} manga", mangaIds.size());
        
        return mangaIds.stream()
            .map(this::getBasicMangaInfo)  // Используем базовую информацию для производительности
            .filter(Objects::nonNull)
            .toList();
    }

    /**
     * Проверить, есть ли данные в кеше для указанной манги.
     */
    public boolean isCached(Long mangaId) {
        // TODO: Добавить проверку наличия в кеше без загрузки данных
        return false;
    }

    /**
     * Очистить кеш для конкретной манги.
     */
    @CacheEvict(value = "mangaMetadata", key = "#mangaId")
    public void evictMangaFromCache(Long mangaId) {
        log.debug("Evicted manga metadata from cache for mangaId: {}", mangaId);
    }

    /**
     * Очистить кеш также для базовой информации манги.
     */
    @CacheEvict(value = "mangaMetadata", key = "'basic_' + #mangaId")
    public void evictBasicMangaFromCache(Long mangaId) {
        log.debug("Evicted basic manga info from cache for mangaId: {}", mangaId);
    }

    /**
     * Очистить весь кеш метаданных манги.
     */
    @CacheEvict(value = "mangaMetadata", allEntries = true)
    public void evictAllMangaCache() {
        log.info("Evicted all manga metadata from cache");
    }

    /**
     * Предварительно загрузить данные в кеш для списка манг.
     */
    public void preloadCache(List<Long> mangaIds) {
        log.info("Preloading cache for {} manga", mangaIds.size());
        
        mangaIds.forEach(mangaId -> {
            try {
                getBasicMangaInfo(mangaId);  // Загружаем базовую информацию
            } catch (Exception e) {
                log.warn("Failed to preload manga metadata for mangaId: {}", mangaId, e);
            }
        });
        
        log.info("Finished preloading cache");
    }

    /**
     * Создать fallback метаданные для манги в случае ошибки.
     */
    private MangaMetadataDto createFallbackMetadata(Long mangaId) {
        log.warn("Creating fallback metadata for mangaId: {}", mangaId);
        return MangaMetadataDto.builder()
            .mangaId(mangaId)
            .title("Unknown Title")
            .genres(List.of())
            .tags(List.of())
            .coverUrl(null)
            .averageRating(0.0)
            .views(0L)
            .updatedAt(LocalDateTime.now())
            .build();
    }
}
