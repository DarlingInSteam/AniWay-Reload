package com.example.recommendationservice.mapper;

import com.example.recommendationservice.dto.SimilarMangaDto;
import com.example.recommendationservice.dto.MangaMetadataDto;
import com.example.recommendationservice.entity.SimilarMangaRating;
import com.example.recommendationservice.entity.VoteType;
import com.example.recommendationservice.service.MangaDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SimilarMangaMapper {

    private final MangaDataService mangaDataService;

    /**
     * Преобразовать рейтинг манги в DTO с учетом голоса пользователя.
     * Полные данные манги получаются из MangaService через Gateway.
     *
     * @param rating рейтинг похожей манги из базы данных
     * @param userVote тип голоса пользователя или null если пользователь не голосовал
     * @return DTO с информацией о похожей манге
     */
    public SimilarMangaDto toDto(SimilarMangaRating rating, VoteType userVote) {
        // Получаем полные данные манги из кеша или MangaService через Gateway
        MangaMetadataDto mangaData = mangaDataService.getBasicMangaInfo(rating.getTargetMangaId());

        String title = "Unknown Title";
        String cover = null;

        if (mangaData != null) {
            title = mangaData.getTitle() != null ? mangaData.getTitle() : "Unknown Title";
            cover = mangaData.getCoverUrl();
        }

        return SimilarMangaDto.builder()
                .suggestionId(rating.getSuggestionId())
                .targetMangaId(rating.getTargetMangaId())
                .rating(rating.getRating())
                .upvotes(rating.getUpvotes())
                .downvotes(rating.getDownvotes())
                .userVote(userVote)
                .targetMangaTitle(title)
                .targetMangaCover(cover)
                .suggestedBy("User placeholder") // TODO: Добавить получение информации о пользователе если необходимо
                .build();
    }
}
