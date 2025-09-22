package shadowshift.studio.authservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import shadowshift.studio.authservice.dto.ReviewDTO;
import shadowshift.studio.authservice.service.ReviewService;

import java.util.Optional;

@RestController
@RequestMapping("/internal/reviews")
@RequiredArgsConstructor
public class InternalReviewController {

    private final ReviewService reviewService;

    @GetMapping("/{id}")
    public ResponseEntity<InternalReviewResponse> get(@PathVariable Long id) {
        Optional<ReviewDTO> dto = reviewService.getReviewById(id, null);
        if (dto.isEmpty()) return ResponseEntity.notFound().build();
        ReviewDTO r = dto.get();
        return ResponseEntity.ok(new InternalReviewResponse(r.getId(), r.getUserId(), r.getMangaId(), r.getRating()));
    }

    public record InternalReviewResponse(Long id, Long userId, Long mangaId, Integer rating) {}
}
