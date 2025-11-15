package com.example.recommendationservice.repository;

import com.example.recommendationservice.entity.SimilarMangaSuggestions;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Репозиторий для работы с предложениями похожих манг.
 * Предоставляет методы для поиска и управления предложениями связей между мангами.
 *
 * @author ShadowShiftStudio
 */
@Repository
public interface SimilarMangaSuggestionsRepository extends JpaRepository<SimilarMangaSuggestions, Long> {

    /**
     * Найти предложение по идентификаторам исходной и целевой манги.
     * Используется для проверки существования предложения перед созданием нового.
     *
     * @param sourceMangaId идентификатор исходной манги
     * @param targetMangaId идентификатор целевой манги
     * @return Optional с предложением, если найдено
     */
    Optional<SimilarMangaSuggestions> findBySourceMangaIdAndTargetMangaId(Long sourceMangaId, Long targetMangaId);
}
