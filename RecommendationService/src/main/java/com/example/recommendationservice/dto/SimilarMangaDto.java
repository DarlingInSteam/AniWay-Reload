package com.example.recommendationservice.dto;

import com.example.recommendationservice.entity.VoteType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO для передачи информации о похожей манге с рейтингом и пользовательскими данными.
 * Содержит агрегированную информацию о предложении, включая голоса и метаданные манги.
 *
 * @author ShadowShiftStudio
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SimilarMangaDto {
    /** Идентификатор предложения */
    private Long suggestionId;

    /** Идентификатор целевой (рекомендуемой) манги */
    private Long targetMangaId;

    /** Название целевой манги */
    private String targetMangaTitle;

    /** URL обложки целевой манги */
    private String targetMangaCover;

    /** Общий рейтинг предложения (upvotes - downvotes) */
    private Integer rating;

    /** Количество положительных голосов */
    private Integer upvotes;

    /** Количество отрицательных голосов */
    private Integer downvotes;

    /** Голос текущего пользователя (null если не голосовал) */
    private VoteType userVote;

    /** Имя пользователя, предложившего рекомендацию */
    private String suggestedBy;
}
