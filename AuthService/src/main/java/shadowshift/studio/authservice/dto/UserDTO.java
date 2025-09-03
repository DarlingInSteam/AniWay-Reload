package shadowshift.studio.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import shadowshift.studio.authservice.entity.Role;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {
    private Long id;
    private String username;
    private String email;
    private String displayName;
    private String avatar;
    private String bio;
    private Role role;
    private Boolean isEnabled;
    private LocalDateTime createdAt;
    private LocalDateTime lastLogin;
    
    // Alias fields for frontend compatibility
    private LocalDateTime registrationDate;
    private LocalDateTime lastLoginDate;
    
    // Statistics
    private Integer chaptersReadCount;
    private Integer likesGivenCount;
    private Integer commentsCount;
}
