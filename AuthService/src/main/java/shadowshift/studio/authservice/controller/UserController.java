package shadowshift.studio.authservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.authservice.dto.UserDTO;
import shadowshift.studio.authservice.service.UserService;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.0.3:3000"})
public class UserController {
    
    private final UserService userService;
    
    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(Authentication authentication) {
        try {
            UserDTO user = userService.getUserByUsername(authentication.getName());
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            log.error("Get current user failed: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
    
    @PutMapping("/me")
    public ResponseEntity<UserDTO> updateCurrentUser(
            @RequestBody UserDTO updateRequest,
            Authentication authentication
    ) {
        try {
            UserDTO user = userService.updateUserProfile(authentication.getName(), updateRequest);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            log.error("Update current user failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO> getUserById(@PathVariable Long id) {
        try {
            UserDTO user = userService.getUserById(id);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            log.error("Get user by id failed: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/username/{username}")
    public ResponseEntity<UserDTO> getUserByUsername(@PathVariable String username) {
        try {
            UserDTO user = userService.getUserByUsername(username);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            log.error("Get user by username failed: {}", e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/search")
    public ResponseEntity<List<UserDTO>> searchUsers(@RequestParam String query) {
        try {
            List<UserDTO> users = userService.searchUsers(query);
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            log.error("Search users failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/top-readers")
    public ResponseEntity<List<UserDTO>> getTopReaders() {
        try {
            List<UserDTO> topReaders = userService.getTopReaders();
            return ResponseEntity.ok(topReaders);
        } catch (Exception e) {
            log.error("Get top readers failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PutMapping("/profile")
    public ResponseEntity<UserDTO> updateProfile(
            @RequestBody UserDTO updateRequest,
            Authentication authentication
    ) {
        try {
            UserDTO user = userService.updateUserProfile(authentication.getName(), updateRequest);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            log.error("Update profile failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
}
