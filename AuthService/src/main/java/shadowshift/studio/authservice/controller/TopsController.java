package shadowshift.studio.authservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.authservice.dto.ReviewDTO;
import shadowshift.studio.authservice.dto.UserDTO;
import shadowshift.studio.authservice.entity.User;
import shadowshift.studio.authservice.mapper.UserMapper;
import shadowshift.studio.authservice.repository.ReviewRepository;
import shadowshift.studio.authservice.repository.UserRepository;
import shadowshift.studio.authservice.service.ReviewService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Контроллер для публичных рейтингов (топов) пользователей и отзывов.
 * Позволяет получать списки лидеров по различным метрикам.
 */
@RestController
@RequestMapping("/api/auth/tops")
@RequiredArgsConstructor
@Slf4j
public class TopsController {

    private final UserRepository userRepository;
    private final ReviewRepository reviewRepository;
    private final ReviewService reviewService;

    /**
     * Топ пользователей по заданной метрике.
     * metric: readers|likes|comments (в будущем level)
     * @param metric метрика
     * @param limit предел (по умолчанию 10, максимум 100)
     */
    @GetMapping("/users")
    public ResponseEntity<List<UserDTO>> topUsers(
            @RequestParam(defaultValue = "readers") String metric,
            @RequestParam(defaultValue = "10") int limit
    ) {
        int capped = Math.min(Math.max(limit, 1), 100);
        PageRequest pr = PageRequest.of(0, capped);
        List<User> users;
        switch (metric) {
            case "likes" -> users = userRepository.findTopByLikes(pr).getContent();
            case "comments" -> users = userRepository.findTopByComments(pr).getContent();
            case "readers" -> users = userRepository.findTopReaders().stream().limit(capped).collect(Collectors.toList());
            // placeholder for future level metric
            default -> users = userRepository.findTopReaders().stream().limit(capped).collect(Collectors.toList());
        }
        return ResponseEntity.ok(UserMapper.toUserListDTO(users));
    }

    /**
     * Топ отзывов за период (days=N). Если days не указан -> последние 7.
     * Сортировка: (likes - dislikes) DESC, likes DESC, createdAt DESC
     * @param days период в днях (1..90)
     * @param limit предел (по умолчанию 10)
     */
    @GetMapping("/reviews")
    public ResponseEntity<List<ReviewDTO>> topReviews(
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(defaultValue = "10") int limit
    ) {
        int safeDays = Math.min(Math.max(days,1),90);
        int capped = Math.min(Math.max(limit,1),100);
        LocalDateTime from = LocalDateTime.now().minusDays(safeDays);
        var page = reviewRepository.findTopReviewsSince(from, PageRequest.of(0, capped));
        // Need DTO conversion with no current user context => null
        List<ReviewDTO> dtos = page.getContent().stream()
                .map(r -> reviewService.getReviewById(r.getId(), null).orElse(null))
                .filter(r -> r != null)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }
}
