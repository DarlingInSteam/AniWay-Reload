package shadowshift.studio.mangaservice.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Moderation request for approving or rejecting proposed characters.
 */
public class MangaCharacterModerationDTO {

    @NotBlank(message = "Статус обязателен")
    private String status;

    private String reason;

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}
