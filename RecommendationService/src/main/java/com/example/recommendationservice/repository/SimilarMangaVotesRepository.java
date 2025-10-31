package com.example.recommendationservice.repository;

import com.example.recommendationservice.entity.SimilarMangaVotes;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Репозиторий для работы с голосами пользователей по предложениям похожих манг.
 * Предоставляет методы для поиска, создания и управления голосами пользователей.
 *
 * @author ShadowShiftStudio
 */
@Repository
public interface SimilarMangaVotesRepository extends JpaRepository<SimilarMangaVotes,Long> {

    /**
     * Найти голос пользователя для конкретного предложения.
     * Используется для проверки существования голоса перед его обновлением или созданием.
     *
     * @param suggestionId идентификатор предложения
     * @param userId идентификатор пользователя
     * @return Optional с голосом, если найден
     */
    Optional<SimilarMangaVotes> findBySuggestionIdAndUserId(Long suggestionId, Long userId);
    
    /**
     * Найти все голоса пользователя для списка предложений.
     * Используется для получения пользовательских голосов при отображении списка похожих манг.
     *
     * @param suggestionIds список идентификаторов предложений
     * @param userId идентификатор пользователя
     * @return список голосов пользователя для указанных предложений
     */
    @Query("SELECT v FROM SimilarMangaVotes v WHERE v.suggestion.id IN :suggestionIds AND v.userId = :userId")
    List<SimilarMangaVotes> findBySuggestionIdsAndUserId(@Param("suggestionIds") List<Long> suggestionIds, @Param("userId") Long userId);
}