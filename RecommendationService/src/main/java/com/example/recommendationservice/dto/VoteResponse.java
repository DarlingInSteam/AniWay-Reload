package com.example.recommendationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO для ответа на операции голосования по предложениям похожих манг.
 * Содержит статус операции, обновленную статистику голосов и информационное сообщение.
 *
 * @author ShadowShiftStudio
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VoteResponse {
    /** Флаг успешности операции голосования */
    private Boolean success;

    /** Новый рейтинг предложения после операции (upvotes - downvotes) */
    private Integer newRating;

    /** Текущее количество положительных голосов */
    private Integer upvotes;

    /** Текущее количество отрицательных голосов */
    private Integer downvotes;

    /** Информационное сообщение о результате операции */
    private String message;
}
