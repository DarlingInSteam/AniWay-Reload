package shadowshift.studio.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MangaRatingDTO {
    
    private Long mangaId;
    private Double averageRating;
    private Long totalReviews;
    private Long[] ratingDistribution; // Array of counts for ratings 1-10
    
    // Helper method to get formatted average rating
    public String getFormattedRating() {
        if (averageRating == null || averageRating == 0) {
            return "Нет оценок";
        }
        return String.format("%.1f", averageRating);
    }
    
    // Helper method to get rating out of 10
    public String getRatingOutOf10() {
        if (averageRating == null || averageRating == 0) {
            return "0.0/10";
        }
        return String.format("%.1f/10", averageRating);
    }
}
