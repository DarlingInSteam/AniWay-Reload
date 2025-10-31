package com.example.recommendationservice.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Сущность для хранения предложений о похожих мангах.
 * Представляет связь между двумя мангами, предложенную пользователем как рекомендацию.
 *
 * @author ShadowShiftStudio
 */
@Entity
@Table(name = "similar_manga_suggestions")
@Data
public class SimilarMangaSuggestions {

    /** Уникальный идентификатор предложения */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Идентификатор исходной манги */
    @Column(name = "source_manga_id", nullable = false)
    private Long sourceMangaId;

    /** Идентификатор предлагаемой похожей манги */
    @Column(name = "target_manga_id", nullable = false)
    private  Long targetMangaId;

    /** Идентификатор пользователя, создавшего предложение */
    @Column(name = "suggested_by_user_id", nullable = false)
    private Long suggestedByUserId;

    /** Дата и время создания предложения */
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    /**
     * Автоматически устанавливает время создания при сохранении сущности.
     */
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
