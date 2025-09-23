package shadowshift.studio.authservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.authservice.dto.AdminActionLogDTO;
import shadowshift.studio.authservice.dto.UserDTO;
import shadowshift.studio.authservice.service.AdminUtilityService;
import shadowshift.studio.authservice.dto.UserStatsDTO;
import shadowshift.studio.authservice.entity.BanType;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;

import java.util.List;

@RestController
@RequestMapping("/api/admin/util")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.0.3:3000"})
public class AdminUtilityController {
    private final AdminUtilityService adminUtilityService;

    @PutMapping("/ban-toggle")
    public ResponseEntity<Void> toggleBanStatus(
            @RequestParam Long userId,
            @RequestParam Long adminId,
            @RequestParam String reason
    ) {
        try {
            adminUtilityService.banOrUnBanUserById(adminId, userId, reason);
            log.info("Access change ban status for user ID: {}", userId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Admin ban/unban user failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Новый расширенный endpoint для применения конкретного типа бана.
     * Принимает JSON:
     * {
     *   "adminId": 1,
     *   "userId": 2,
     *   "banType": "PERM|TEMP|SHADOW|NONE",
     *   "expiresAt": "2025-12-31T23:59:59", // опционально для TEMP
     *   "reason": "LEGACY_STRING",
     *   "reasonCode": "CODE123",
     *   "reasonDetails": "Expanded human text",
     *   "metaJson": "{...}",
     *   "diffJson": "[ ... ]"
     * }
     */
    @PostMapping("/ban")
    public ResponseEntity<?> applyBan(@RequestBody java.util.Map<String, Object> body) {
        try {
            Long adminId = ((Number) body.get("adminId")).longValue();
            Long userId = ((Number) body.get("userId")).longValue();
            String banTypeStr = (String) body.getOrDefault("banType", "NONE");
            BanType banType = BanType.valueOf(banTypeStr.toUpperCase());
            String expiresAtStr = (String) body.get("expiresAt");
            LocalDateTime expiresAt = null;
            if (expiresAtStr != null && !expiresAtStr.isBlank()) {
                try { expiresAt = LocalDateTime.parse(expiresAtStr); } catch (DateTimeParseException ex) { return ResponseEntity.badRequest().body("Invalid expiresAt format"); }
            }
            String reason = (String) body.getOrDefault("reason", "");
            String reasonCode = (String) body.get("reasonCode");
            String reasonDetails = (String) body.get("reasonDetails");
            String metaJson = (String) body.get("metaJson");
            String diffJson = (String) body.get("diffJson");

            adminUtilityService.applyBan(adminId, userId, banType, expiresAt, reason, reasonCode, reasonDetails, metaJson, diffJson);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            log.error("applyBan failed: {}", e.getMessage());
            return ResponseEntity.internalServerError().body("Internal error");
        }
    }

    @GetMapping("/users-count")
    public ResponseEntity<Long> getUsersCount() {
        try {
            Long count = adminUtilityService.getTotalUsersCount();
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            log.error("Get users count failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/users-stats")
    public ResponseEntity<UserStatsDTO> getUserStats() {
        try {
            return ResponseEntity.ok(adminUtilityService.getUserStats());
        } catch (Exception e) {
            log.error("Get users stats failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/users/sortable")
    public ResponseEntity<Page<UserDTO>> getAllUsersSorted(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "username") String sortBy,
            @RequestParam(defaultValue = "asc") String sortOrder,
            @RequestParam String query,
            @RequestParam String role
    ) {
        try {
            Page<UserDTO> users = adminUtilityService.getUsersSortablePage(page, size, sortBy, sortOrder, query, role);
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            log.error("Get all users sortable page failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserDTO>> getAllUsersPage(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        try {
            List<UserDTO> users = adminUtilityService.getUsersPage(page, size);
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            log.error("Get all users page failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/users/{userId}/role")
    public ResponseEntity<Void> changeRole(
            @PathVariable Long userId,
            @RequestParam Long adminId,
            @RequestParam String reason,
            @RequestParam String role) {
        try {
            adminUtilityService.updateUserRole(adminId, userId, reason, role);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("Admin update user role failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/logs")
    public ResponseEntity<List<AdminActionLogDTO>> getLogs() {
        try {
            List<AdminActionLogDTO> logs = adminUtilityService.getLogs();
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
            log.error("Get admin logs failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/logs/paged")
    public ResponseEntity<Page<AdminActionLogDTO>> getLogsPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "timestamp") String sortBy,
            @RequestParam(defaultValue = "desc") String sortOrder,
            @RequestParam(required = false) String admin,
            @RequestParam(required = false) String target,
            @RequestParam(required = false) String action
    ) {
        try {
            return ResponseEntity.ok(adminUtilityService.getLogsPaged(page,size,sortBy,sortOrder,admin,target,action));
        } catch (Exception e) {
            log.error("Get admin logs paged failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}
