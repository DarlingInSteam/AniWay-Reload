package shadowshift.studio.messageservice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "channel_read_markers")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChannelReadMarkerEntity {

    @EmbeddedId
    private ChannelReadMarkerId id;

    @ManyToOne
    @MapsId("categoryId")
    @JoinColumn(name = "category_id")
    private ChatCategoryEntity category;

    @Column(name = "last_read_message_id")
    private UUID lastReadMessageId;

    @Column(name = "last_read_at")
    private LocalDateTime lastReadAt;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @lombok.EqualsAndHashCode
    public static class ChannelReadMarkerId implements Serializable {
        @jakarta.persistence.Column(name = "category_id")
        private Long categoryId;

        @jakarta.persistence.Column(name = "user_id")
        private Long userId;
    }
}
