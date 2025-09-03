package shadowshift.studio.commentservice.security;

import lombok.Data;

/**
 * Ответ от AuthService для валидации пользователя
 */
@Data
public class UserValidationResponse {
    private boolean valid;
    private Long userId;
    private String username;
    private String role;
    private String error;
}
