package shadowshift.studio.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * DTO для рейтинга манги.
 * Содержит средний рейтинг, общее количество отзывов и распределение рейтингов.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MangaRatingDTO {
    
    /** Идентификатор манги. */
    private Long mangaId;
    
    /** Средний рейтинг. */
    private Double averageRating;
    
    /** Общее количество отзывов. */
    private Long totalReviews;
    
    /** Распределение рейтингов: массив счетчиков для рейтингов 1-10. */
    private Long[] ratingDistribution; // Array of counts for ratings 1-10
    
    /**
     * Возвращает отформатированный средний рейтинг.
     *
     * @return строка с рейтингом или "Нет оценок"
     */
    public String getFormattedRating() {
        if (averageRating == null || averageRating == 0) {
            return "Нет оценок";
        }
        return String.format("%.1f", averageRating);
    }
    
    /**
     * Возвращает рейтинг из 10.
     *
     * @return строка с рейтингом в формате "X.X/10" или "0.0/10"
     */
    public String getRatingOutOf10() {
        if (averageRating == null || averageRating == 0) {
            return "0.0/10";
        }
        return String.format("%.1f/10", averageRating);
    }
}
