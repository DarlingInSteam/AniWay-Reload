package com.example.recommendationservice.repository;

import com.example.recommendationservice.entity.SimilarMangaRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Репозиторий для работы с агрегированными рейтингами предложений похожих манг.
 * Предоставляет доступ только для чтения к materialized view с предвычисленными статистиками.
 * Данные автоматически обновляются через триггеры базы данных при изменении голосов.
 *
 * @author ShadowShiftStudio
 */
@Repository
public interface SimilarMangaRatingRepository extends JpaRepository<SimilarMangaRating, Long> {

    /**
     * Найти все рейтинги для исходной манги, отсортированные по убыванию рейтинга.
     * Используется для получения списка похожих манг с наивысшими рейтингами.
     *
     * @param sourceMangaId идентификатор исходной манги
     * @return список рейтингов, отсортированный от самого высокого к самому низкому
     */
    List<SimilarMangaRating> findBySourceMangaIdOrderByRatingDesc(Long sourceMangaId);

    void refreshMaterializedView();
}