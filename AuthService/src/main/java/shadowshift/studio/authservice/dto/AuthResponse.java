package shadowshift.studio.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    private String type;
    private UserDTO user;
    
    public static AuthResponse of(String token, UserDTO user) {
        return AuthResponse.builder()
                .token(token)
                .type("Bearer")
                .user(user)
                .build();
    }
}
