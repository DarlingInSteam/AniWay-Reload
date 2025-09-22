package shadowshift.studio.authservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

public class EmailVerificationDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RequestCodeRequest {
        @NotBlank
        @Email
        private String email;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RequestCodeResponse {
        private UUID requestId;
        private long expiresInSeconds;
        private boolean alreadyRegistered;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifyCodeRequest {
        @NotBlank
        private String requestId; // UUID string
        @NotBlank
        @Pattern(regexp = "^[0-9]{6}$", message = "Code must be 6 digits")
        private String code;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class VerifyCodeResponse {
        private boolean success;
        private String verificationToken; // opaque or JWT
        private long expiresInSeconds;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegistrationWithTokenRequest {
        @NotBlank
        private String verificationToken;
        @NotBlank
        private String username;
        @NotBlank
        private String password;
        @NotBlank
        @Email
        private String email;
        private String displayName;
    }
}
