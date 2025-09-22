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
import shadowshift.studio.authservice.mapper.UserMapper;
import shadowshift.studio.authservice.service.AuthService;
import shadowshift.studio.authservice.service.EmailVerificationService;
import shadowshift.studio.authservice.dto.EmailVerificationDtos.*;
import shadowshift.studio.authservice.service.UserService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Контроллер для аутентификации и управления пользователями в системе.
 * Предоставляет REST API для регистрации, входа, получения профиля пользователя,
 * поиска пользователей, валидации токенов и других операций аутентификации.
 * Поддерживает CORS для указанных origins.
 *
 * @author [Ваше имя или команда, если применимо]
 * @version 1.0
 * @since [Дата или версия релиза]
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.0.3:3000"})
public class AuthController {
    
    private final AuthService authService;
    private final EmailVerificationService emailVerificationService;
    private final UserService userService;
    
    /**
     * Регистрирует нового пользователя в системе.
     *
     * @param request объект с данными для регистрации
     * @return ResponseEntity с AuthResponse или ошибкой
     * @throws IllegalArgumentException если регистрация не удалась
     */
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

    @PostMapping("/email/request-code")
    public ResponseEntity<?> requestEmailCode(@Valid @RequestBody RequestCodeRequest request) {
        try {
            var v = emailVerificationService.requestCode(request.getEmail());
            EmailVerificationDtos.RequestCodeResponse resp = new EmailVerificationDtos.RequestCodeResponse(v.getId(), emailVerificationService.getRemainingTtlSeconds(v), userService.existsByEmail(request.getEmail()));
            return ResponseEntity.ok(resp);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/email/verify-code")
    public ResponseEntity<?> verifyEmailCode(@Valid @RequestBody VerifyCodeRequest request) {
        try {
            var token = emailVerificationService.verifyCode(java.util.UUID.fromString(request.getRequestId()), request.getCode());
            return ResponseEntity.ok(EmailVerificationDtos.VerifyCodeResponse.builder().success(true).verificationToken(token).expiresInSeconds(900).build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }
    
    /**
     * Аутентифицирует пользователя и возвращает токен.
     *
     * @param request объект с данными для входа
     * @return ResponseEntity с AuthResponse или ошибкой
     * @throws Exception в случае ошибки аутентификации
     */
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
    
    /**
     * Получает информацию о текущем аутентифицированном пользователе.
     *
     * @param authentication объект аутентификации
     * @return ResponseEntity с UserDTO или ошибкой
     * @throws Exception в случае ошибки получения данных
     */
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
    
    /**
     * Выполняет выход пользователя (для JWT обрабатывается на клиенте).
     *
     * @return ResponseEntity с подтверждением
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        return ResponseEntity.ok().build();
    }
    
    /**
     * Выполняет поиск пользователей по заданным критериям.
     *
     * @param query строка поиска (опционально)
     * @param role роль пользователя (опционально)
     * @param page номер страницы (по умолчанию 0)
     * @param limit количество элементов на странице (по умолчанию 10)
     * @param sortBy поле для сортировки (по умолчанию "username")
     * @param sortOrder порядок сортировки ("asc" или "desc", по умолчанию "asc")
     * @return ResponseEntity с результатами поиска или ошибкой
     * @throws Exception в случае ошибки поиска
     */
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
                    .map(UserMapper::toUserDTO)
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
    
    /**
     * Получает публичный профиль пользователя.
     *
     * @param userId идентификатор пользователя
     * @return ResponseEntity с UserDTO (без приватной информации) или ошибкой
     * @throws Exception в случае ошибки получения данных
     */
    @GetMapping("/users/{userId}/public")
    public ResponseEntity<UserDTO> getPublicUserProfile(@PathVariable Long userId) {
        try {
            User user = userService.findById(userId);
            if (user == null) {
                return ResponseEntity.notFound().build();
            }
            
            UserDTO userDTO = UserMapper.toUserDTO(user);
            userDTO.setEmail(null);
            
            return ResponseEntity.ok(userDTO);
        } catch (Exception e) {
            log.error("Get public user profile failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Получает полный профиль пользователя (только для владельца или админа).
     *
     * @param userId идентификатор пользователя
     * @param authentication объект аутентификации
     * @return ResponseEntity с UserDTO или ошибкой (403 если нет прав)
     * @throws Exception в случае ошибки получения данных
     */
    @GetMapping("/users/{userId}")
    public ResponseEntity<UserDTO> getUserProfile(@PathVariable Long userId, Authentication authentication) {
        try {
            User currentUser = userService.findByUsername(authentication.getName());
            User targetUser = userService.findById(userId);
            
            if (targetUser == null) {
                return ResponseEntity.notFound().build();
            }
            
            if (!currentUser.getId().equals(userId) && !currentUser.getRole().name().equals("ADMIN")) {
                return ResponseEntity.status(403).build();
            }
            
            UserDTO userDTO = UserMapper.toUserDTO(targetUser);
            return ResponseEntity.ok(userDTO);
        } catch (Exception e) {
            log.error("Get user profile failed: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        }
    }
    
    /**
     * Валидирует JWT токен и возвращает информацию о пользователе.
     *
     * @param authHeader заголовок Authorization с токеном
     * @return ResponseEntity с результатом валидации или ошибкой
     * @throws Exception в случае ошибки валидации
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
}
