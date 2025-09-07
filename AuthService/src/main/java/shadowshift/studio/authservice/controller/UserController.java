package shadowshift.studio.authservice.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.authservice.dto.UserDTO;
import shadowshift.studio.authservice.service.UserService;

import java.util.List;

/**
 * Контроллер для управления пользователями в системе.
 * Предоставляет REST API для получения, обновления профилей пользователей,
 * поиска пользователей и получения топ-читателей.
 * Поддерживает CORS для указанных origins.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://192.168.0.3:3000"})
public class UserController {
    
    private final UserService userService;
    
    /**
     * Получает информацию о текущем аутентифицированном пользователе.
     *
     * @param authentication объект аутентификации
     * @return ResponseEntity с UserDTO или 404, если не найдено
     * @throws Exception в случае ошибки получения данных
     */
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
    
    /**
     * Обновляет профиль текущего пользователя.
     *
     * @param updateRequest объект с данными для обновления
     * @param authentication объект аутентификации
     * @return ResponseEntity с UserDTO или ошибкой
     * @throws Exception в случае ошибки обновления
     */
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
    
    /**
     * Получает пользователя по идентификатору.
     *
     * @param id идентификатор пользователя
     * @return ResponseEntity с UserDTO или 404, если не найдено
     * @throws Exception в случае ошибки получения данных
     */
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
    
    /**
     * Получает пользователя по имени пользователя.
     *
     * @param username имя пользователя
     * @return ResponseEntity с UserDTO или 404, если не найдено
     * @throws Exception в случае ошибки получения данных
     */
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
    
    /**
     * Выполняет поиск пользователей по запросу.
     *
     * @param query строка поиска
     * @return ResponseEntity со списком UserDTO или ошибкой
     * @throws Exception в случае ошибки поиска
     */
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
    
    /**
     * Получает список топ-читателей.
     *
     * @return ResponseEntity со списком UserDTO или ошибкой
     * @throws Exception в случае ошибки получения данных
     */
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
    
    /**
     * Обновляет профиль пользователя (альтернативный эндпоинт).
     *
     * @param updateRequest объект с данными для обновления
     * @param authentication объект аутентификации
     * @return ResponseEntity с UserDTO или ошибкой
     * @throws Exception в случае ошибки обновления
     */
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
