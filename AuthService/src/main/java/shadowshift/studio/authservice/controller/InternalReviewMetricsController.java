package shadowshift.studio.authservice.controller;

import java.util.List;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import shadowshift.studio.authservice.dto.MangaRatingDTO;
import shadowshift.studio.authservice.service.ReviewService;

@RestController
@RequestMapping("/internal/reviews/manga")
@RequiredArgsConstructor
public class InternalReviewMetricsController {

    private final ReviewService reviewService;

    @PostMapping("/aggregate")
    public ResponseEntity<List<MangaRatingDTO>> aggregateMangaReviews(@RequestBody MangaAggregateRequest request) {
        if (request == null || request.mangaIds() == null) {
            return ResponseEntity.badRequest().build();
        }

        List<MangaRatingDTO> ratings = reviewService.getMangaRatings(request.mangaIds());
        return ResponseEntity.ok(ratings);
    }

    public record MangaAggregateRequest(List<Long> mangaIds) {}
}
