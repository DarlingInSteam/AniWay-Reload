package shadowshift.studio.authservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
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
    public ResponseEntity<Void> toggleBanStatus(@RequestParam Long userId) {
        try {
            adminUtilityService.banOrUnBanUserById(userId);
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
    public ResponseEntity<List<UserDTO>> getAllUsersSorted(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "username") String sortBy,
            @RequestParam(defaultValue = "asc") String sortOrder
    ) {
        try {
            List<UserDTO> users = adminUtilityService.getUsersSortablePage(page, size, sortBy, sortOrder);
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

}
