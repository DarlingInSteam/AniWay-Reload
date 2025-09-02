package shadowshift.studio.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import shadowshift.studio.authservice.entity.BookmarkStatus;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookmarkDTO {
    private Long id;
    private Long userId;
    private Long mangaId;
    private BookmarkStatus status;
    private Boolean isFavorite;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Manga info for display
    private String mangaTitle;
    private String mangaCoverUrl;
}
