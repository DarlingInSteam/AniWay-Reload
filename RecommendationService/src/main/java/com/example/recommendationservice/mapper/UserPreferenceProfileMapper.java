package com.example.recommendationservice.mapper;

import com.example.recommendationservice.dto.UserPreferenceProfileDto;
import com.example.recommendationservice.entity.UserPreferenceProfile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class UserPreferenceProfileMapper {

    public  static UserPreferenceProfileDto toDto(UserPreferenceProfile entity) {
        if (entity == null) {
            return null;
        }
        return UserPreferenceProfileDto.builder()
                .genreWeights(entity.getGenreWeights())
                .tagWeights(entity.getTagWeights())
                .genreFrequency(entity.getGenreFrequency())
                .tagFrequency(entity.getTagFrequency())
                .totalMangaCount(entity.getTotalMangaCount())
                .build();
    }

    public static UserPreferenceProfile toEntity(UserPreferenceProfileDto dto, Long userId) {
        if (dto == null) {
            return null;
        }
        return UserPreferenceProfile.builder()
                .userId(userId)
                .genreWeights(dto.getGenreWeights())
                .tagWeights(dto.getTagWeights())
                .genreFrequency(dto.getGenreFrequency())
                .tagFrequency(dto.getTagFrequency())
                .totalMangaCount(dto.getTotalMangaCount())
                .build();
    }


}
