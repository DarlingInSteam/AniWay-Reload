package shadowshift.studio.notificationservice.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "telegram_notification_log",
       indexes = {
               @Index(name = "ix_tg_log_user", columnList = "user_id"),
               @Index(name = "ix_tg_log_chapter", columnList = "chapter_id"),
               @Index(name = "ix_tg_log_status", columnList = "status")
       })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TelegramNotificationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "notification_id")
    private Long notificationId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "chat_id")
    private Long chatId;

    @Column(name = "manga_id")
    private Long mangaId;

    @Column(name = "chapter_id")
    private Long chapterId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private TelegramDeliveryStatus status;

    @Column(name = "error_code", length = 64)
    private String errorCode;

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "retry_count", nullable = false)
    private int retryCount;

    @Column(name = "payload")
    private String payload;

    @CreationTimestamp
    @Column(name = "sent_at", updatable = false)
    private Instant sentAt;
}
