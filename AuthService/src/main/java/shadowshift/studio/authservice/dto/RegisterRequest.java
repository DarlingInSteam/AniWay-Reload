package shadowshift.studio.authservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO для запроса регистрации пользователя.
 * Содержит данные для создания нового аккаунта с валидацией.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegisterRequest {
    
    /** Имя пользователя (обязательно, 3-50 символов). */
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;
    
    /** Email (обязательно, валидный). */
    @NotBlank(message = "Email is required")
    @Email(message = "Email should be valid")
    private String email;
    
    /** Пароль (обязательно, 6-100 символов). */
    @NotBlank(message = "Password is required")
    @Size(min = 6, max = 100, message = "Password must be between 6 and 100 characters")
    private String password;
    
    /** Отображаемое имя (необязательно, до 100 символов). */
    @Size(max = 100, message = "Display name must not exceed 100 characters")
    private String displayName;
}
