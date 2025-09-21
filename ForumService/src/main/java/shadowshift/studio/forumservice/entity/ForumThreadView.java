package shadowshift.studio.forumservice.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "forum_thread_views")
@EqualsAndHashCode(of = "id")
public class ForumThreadView {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "thread_id", nullable = false)
    private Long threadId;
    
    @Column(name = "user_id")
    private Long userId; // NULL для анонимных пользователей
    
    @Column(name = "ip_address")
    private String ipAddress; // для анонимных пользователей
    
    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    
    // Связи
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "thread_id", insertable = false, updatable = false)
    private ForumThread thread;
}