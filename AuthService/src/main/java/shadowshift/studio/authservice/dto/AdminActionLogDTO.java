package shadowshift.studio.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import shadowshift.studio.authservice.entity.ActionType;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminActionLogDTO {
    private Long id;
    private Long adminId;
    private String adminName;
    private Long userId;
    private String targetUserName;
    private ActionType actionType;
    private String description;
    private String reason;
    private String reasonCode;
    private String reasonDetails;
    private String metaJson;
    private String diffJson;
    private LocalDateTime timestamp;
}
