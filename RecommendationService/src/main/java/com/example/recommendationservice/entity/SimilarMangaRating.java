package com.example.recommendationservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import org.hibernate.annotations.Immutable;

/**
 * Неизменяемая сущность для хранения агрегированных рейтингов предложений похожих манг.
 * Представляет materialized view с предвычисленными статистиками голосов.
 * Используется только для чтения, обновляется через триггеры базы данных.
 *
 * @author ShadowShiftStudio
 */
@Entity
@Table(name = "similar_manga_ratings")
@Immutable
@Data
public class SimilarMangaRating {

    /** Идентификатор предложения (первичный ключ) */
    @Id
    @Column(name = "suggestion_id")
    private Long suggestionId;

    /** Идентификатор исходной манги */
    @Column(name = "source_manga_id")
    private Long sourceMangaId;

    /** Идентификатор предлагаемой похожей манги */
    @Column(name = "target_manga_id")
    private Long targetMangaId;

    /** Количество положительных голосов */
    private Integer upvotes;

    /** Количество отрицательных голосов */
    private Integer downvotes;

    /** Итоговый рейтинг (upvotes - downvotes) */
    private Integer rating;
}
