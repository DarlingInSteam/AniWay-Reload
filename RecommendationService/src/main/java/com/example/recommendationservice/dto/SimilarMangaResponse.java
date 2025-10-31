package com.example.recommendationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO для ответа на запрос получения похожих манг.
 * Содержит идентификатор исходной манги и список рекомендаций с рейтингами.
 *
 * @author ShadowShiftStudio
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimilarMangaResponse {
    /** Идентификатор исходной манги, для которой запрашивались рекомендации */
    private Long mangaId;

    /** Список похожих манг с рейтингами, отсортированный по убыванию рейтинга */
    private List<SimilarMangaDto> similarMangaDtoList;
}
