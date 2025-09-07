package shadowshift.studio.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO для ответа аутентификации.
 * Содержит токен доступа, тип токена и информацию о пользователе.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    
    /** Токен доступа. */
    private String token;
    
    /** Тип токена. */
    private String type;
    
    /** Информация о пользователе. */
    private UserDTO user;
    
    public static AuthResponse of(String token, UserDTO user) {
        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .user(user)
                .build();
    }
}
