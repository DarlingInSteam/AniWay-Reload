package shadowshift.studio.authservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.authservice.dto.AdminActionLogDTO;
import shadowshift.studio.authservice.dto.UserDTO;
import shadowshift.studio.authservice.service.AdminUtilityService;

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
}
