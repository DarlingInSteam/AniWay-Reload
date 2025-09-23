package shadowshift.studio.authservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;


@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "admin_action_logs")
public class AdminActionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long adminId;

    @Column(nullable = false)
    private String adminName;

    @Column(nullable = false)
    private ActionType actionType;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String targetUserName;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private String reason;

    /** Код стандартизированной причины (если используется структурированный режим). */
    @Column(name = "reason_code")
    private String reasonCode;

    /** Детализированное текстовое объяснение / шаблон после подстановки. */
    @Column(name = "reason_details", columnDefinition = "TEXT")
    private String reasonDetails;

    /** Сериализованный JSON с метаданными (k/v). */
    @Column(name = "meta_json", columnDefinition = "TEXT")
    private String metaJson;

    /** Сериализованный JSON с diff (массив объектов). */
    @Column(name = "diff_json", columnDefinition = "TEXT")
    private String diffJson;

    @Column(nullable = false)
    private LocalDateTime timestamp;

}
