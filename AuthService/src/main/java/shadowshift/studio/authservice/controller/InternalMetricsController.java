package shadowshift.studio.authservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.authservice.service.UserService;

/**
 * Internal controller exposing lightweight endpoints for other services
 * to update user engagement counters (commentsCount, likesGivenCount).
 * These endpoints are not intended for public consumption and should be
 * protected at the gateway / network layer. They return 200 always to
 * avoid cascading failures; missing users are ignored silently.
 */
@RestController
@RequestMapping("/internal/metrics/users")
@RequiredArgsConstructor
@Slf4j
public class InternalMetricsController {

    private final UserService userService;

    @PostMapping("/{userId}/comments/increment")
    public ResponseEntity<Void> incrementComments(@PathVariable Long userId) {
        userService.incrementCommentsCount(userId);
            log.info("[InternalMetrics] Incremented commentsCount for user {}", userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{userId}/likes-given/increment")
    public ResponseEntity<Void> incrementLikesGiven(@PathVariable Long userId) {
        userService.incrementLikesGivenCount(userId);
            log.info("[InternalMetrics] Incremented likesGivenCount for user {}", userId);
        return ResponseEntity.ok().build();
    }
}
