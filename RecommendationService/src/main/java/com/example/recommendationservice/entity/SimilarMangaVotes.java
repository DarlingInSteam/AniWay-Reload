package com.example.recommendationservice.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Сущность для хранения голосов пользователей по предложениям похожих манг.
 * Каждый голос связан с конкретным предложением и содержит тип голоса (положительный/отрицательный).
 *
 * @author ShadowShiftStudio
 */
@Entity
@Table(name = "similar_manga_votes")
@Data
public class SimilarMangaVotes {

    /** Уникальный идентификатор голоса */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private  Long id;

    /** Ссылка на предложение, за которое проголосовал пользователь */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "suggestion_id", nullable = false)
    private SimilarMangaSuggestions suggestion;

    /** Идентификатор пользователя, проголосовавшего */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** Тип голоса (UPVOTE или DOWNVOTE) */
    @Enumerated(EnumType.STRING)
    @Column(name = "vote_type", nullable = false)
    private VoteType voteType;

    /** Дата и время голосования */
    @Column(name = "voted_at", nullable = false)
    private LocalDateTime votedAt;

    /**
     * Автоматически устанавливает время голосования при сохранении сущности.
     */
    @PrePersist
    protected void onCreate() {
        votedAt = LocalDateTime.now();
    }
}
