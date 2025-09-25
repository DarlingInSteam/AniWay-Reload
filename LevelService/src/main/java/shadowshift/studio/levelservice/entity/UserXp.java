package shadowshift.studio.levelservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_xp")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserXp {
    @Id
    private Long userId;

    private long totalXp;
    private int level;
    private long xpForNextLevel;

    private LocalDateTime updatedAt;
}
