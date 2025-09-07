package shadowshift.studio.authservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.authservice.dto.ActivityDTO;
import shadowshift.studio.authservice.service.ActivityService;

import java.util.List;

/**
 * Контроллер для получения активности пользователя
 */
@RestController
@RequestMapping("/api/auth/activity")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.0.3:3000"})
public class ActivityController {
    
    private final ActivityService activityService;
    
    /**
     * Получение полной ленты активности пользователя
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ActivityDTO>> getUserActivity(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "20") int limit) {
        try {
            log.info("Getting activity for user {} with limit {}", userId, limit);
            List<ActivityDTO> activities = activityService.getUserActivity(userId, limit);
            return ResponseEntity.ok(activities);
        } catch (Exception e) {
            log.error("Error getting activity for user {}", userId, e);
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Получение только активности чтения
     */
    @GetMapping("/user/{userId}/reading")
    public ResponseEntity<List<ActivityDTO>> getUserReadingActivity(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "20") int limit) {
        try {
            log.info("Getting reading activity for user {} with limit {}", userId, limit);
            List<ActivityDTO> activities = activityService.getUserReadingActivity(userId, limit);
            return ResponseEntity.ok(activities);
        } catch (Exception e) {
            log.error("Error getting reading activity for user {}", userId, e);
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Получение только активности ревью
     */
    @GetMapping("/user/{userId}/reviews")
    public ResponseEntity<List<ActivityDTO>> getUserReviewActivity(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "20") int limit) {
        try {
            log.info("Getting review activity for user {} with limit {}", userId, limit);
            List<ActivityDTO> activities = activityService.getUserReviewActivity(userId, limit);
            return ResponseEntity.ok(activities);
        } catch (Exception e) {
            log.error("Error getting review activity for user {}", userId, e);
            return ResponseEntity.badRequest().build();
        }
    }
}
