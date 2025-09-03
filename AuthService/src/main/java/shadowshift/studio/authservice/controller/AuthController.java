package shadowshift.studio.authservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.authservice.dto.*;
import shadowshift.studio.authservice.entity.User;
import shadowshift.studio.authservice.service.AuthService;
import shadowshift.studio.authservice.service.UserService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.0.3:3000"})
public class AuthController {
    
    private final AuthService authService;
    private final UserService userService;
    
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        try {
            AuthResponse response = authService.register(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            log.error("Registration failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> authenticate(@Valid @RequestBody LoginRequest request) {
        try {
            AuthResponse response = authService.authenticate(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Authentication failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(Authentication authentication) {
        try {
            UserDTO user = authService.getCurrentUser(authentication.getName());
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            log.error("Get current user failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        // In JWT, logout is handled on the client side by removing the token
        return ResponseEntity.ok().build();
    }
    
    // Поиск пользователей
    @GetMapping("/users/search")
    public ResponseEntity<Map<String, Object>> searchUsers(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(defaultValue = "username") String sortBy,
            @RequestParam(defaultValue = "asc") String sortOrder) {
        try {
            Sort.Direction direction = Sort.Direction.fromString(sortOrder);
            PageRequest pageRequest = PageRequest.of(page, limit, Sort.by(direction, sortBy));
            
            Page<User> userPage = userService.searchUsers(query, role, pageRequest);
            
            List<UserDTO> users = userPage.getContent().stream()
                    .map(this::convertToUserDTO)
                    .toList();
            
            Map<String, Object> response = new HashMap<>();
            response.put("users", users);
            response.put("total", userPage.getTotalElements());
            response.put("page", page);
            response.put("totalPages", userPage.getTotalPages());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("User search failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Получение публичного профиля пользователя
    @GetMapping("/users/{userId}/public")
    public ResponseEntity<UserDTO> getPublicUserProfile(@PathVariable Long userId) {
        try {
            User user = userService.findById(userId);
            if (user == null) {
                return ResponseEntity.notFound().build();
            }
            
            UserDTO userDTO = convertToUserDTO(user);
            // Скрываем приватную информацию для публичного профиля
            userDTO.setEmail(null);
            
            return ResponseEntity.ok(userDTO);
        } catch (Exception e) {
            log.error("Get public user profile failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Получение полного профиля пользователя (только для владельца или админа)
    @GetMapping("/users/{userId}")
    public ResponseEntity<UserDTO> getUserProfile(@PathVariable Long userId, Authentication authentication) {
        try {
            User currentUser = userService.findByUsername(authentication.getName());
            User targetUser = userService.findById(userId);
            
            if (targetUser == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Проверяем права доступа
            if (!currentUser.getId().equals(userId) && !currentUser.getRole().name().equals("ADMIN")) {
                return ResponseEntity.status(403).build();
            }
            
            UserDTO userDTO = convertToUserDTO(targetUser);
            return ResponseEntity.ok(userDTO);
        } catch (Exception e) {
            log.error("Get user profile failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Валидация JWT токена и получение информации о пользователе
     */
    @PostMapping("/validate")
    public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String authHeader) {
        try {
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.badRequest().body("Invalid token format");
            }
            
            String token = authHeader.substring(7);
            User user = authService.validateTokenAndGetUser(token);
            
            if (user != null) {
                Map<String, Object> response = new HashMap<>();
                response.put("valid", true);
                response.put("userId", user.getId());
                response.put("username", user.getUsername());
                response.put("role", user.getRole());
                return ResponseEntity.ok(response);
            } else {
                return ResponseEntity.status(401).body(Map.of("valid", false, "error", "Invalid token"));
            }
        } catch (Exception e) {
            log.error("Token validation failed: {}", e.getMessage());
            return ResponseEntity.status(401).body(Map.of("valid", false, "error", e.getMessage()));
        }
    }
    
    private UserDTO convertToUserDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .avatar(user.getAvatar())
                .bio(user.getBio())
                .role(user.getRole())
                .registrationDate(user.getCreatedAt())
                .lastLoginDate(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .lastLogin(user.getLastLogin())
                .build();
    }
}
