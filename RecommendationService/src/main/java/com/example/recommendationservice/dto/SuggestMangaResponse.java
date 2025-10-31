package com.example.recommendationservice.dto;

import lombok.Data;

/**
 * DTO для ответа на запрос создания предложения о похожей манге.
 * Содержит информацию о созданном или существующем предложении и его текущем рейтинге.
 *
 * @author ShadowShiftStudio
 */
@Data
public class SuggestMangaResponse {
    /** Идентификатор предложения (созданного или существующего) */
    private Long suggestionId;

    /** Флаг, указывающий было ли создано новое предложение (true) или использовалось существующее (false) */
    private Boolean isNewSuggestion;

    /** Текущий рейтинг предложения */
    private Integer currentRating;
}
