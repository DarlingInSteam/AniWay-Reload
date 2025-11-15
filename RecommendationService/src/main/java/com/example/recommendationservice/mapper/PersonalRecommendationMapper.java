package com.example.recommendationservice.mapper;

import com.example.recommendationservice.dto.PersonalRecommendationDto;
import com.example.recommendationservice.dto.PersonalRecommendationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class PersonalRecommendationMapper {

    public static PersonalRecommendationResponse toResponse(PersonalRecommendationDto dto, Long userId) {
        if (dto == null) {
            return null;
        }
        return PersonalRecommendationResponse.builder()
                .userId(userId)
                .recommendations(List.of(dto))
                .build();
    }

    public static PersonalRecommendationResponse toResponseList(List<PersonalRecommendationDto> dtoList, Long userId) {
        if (dtoList == null) {
            return null;
        }
        return PersonalRecommendationResponse.builder()
                .userId(userId)
                .recommendations(dtoList)
                .build();
    }
}
