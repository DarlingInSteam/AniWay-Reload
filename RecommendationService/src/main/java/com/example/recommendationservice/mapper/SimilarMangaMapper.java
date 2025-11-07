package com.example.recommendationservice.mapper;

import com.example.recommendationservice.dto.SimilarMangaDto;
import com.example.recommendationservice.entity.SimilarMangaRating;
import com.example.recommendationservice.entity.SimilarMangaSuggestions;
import com.example.recommendationservice.entity.VoteType;
import org.springframework.stereotype.Component;

@Component
public class SimilarMangaMapper {

    /**
     * Преобразовать рейтинг манги в DTO с учетом голоса пользователя.
     *
     * @param rating рейтинг похожей манги из базы данных
     * @param userVote тип голоса пользователя или null если пользователь не голосовал
     * @return DTO с информацией о похожей манге
     */
    public static SimilarMangaDto toDto(SimilarMangaRating rating, VoteType userVote) {
        return SimilarMangaDto.builder()
                .suggestionId(rating.getSuggestionId())
                .targetMangaId(rating.getTargetMangaId())
                .rating(rating.getRating())
                .upvotes(rating.getUpvotes())
                .downvotes(rating.getDownvotes())
                .userVote(userVote)
                // TODO: Добавить получение информации о манге (title, cover) из MangaService
                .targetMangaTitle("Title placeholder")
                .targetMangaCover("Cover placeholder")
                .suggestedBy("User placeholder")
                .build();
    }
}
