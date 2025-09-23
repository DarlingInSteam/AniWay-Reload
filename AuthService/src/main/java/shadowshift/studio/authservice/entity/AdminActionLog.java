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

    @Column(nullable = false)
    private LocalDateTime timestamp;

}
