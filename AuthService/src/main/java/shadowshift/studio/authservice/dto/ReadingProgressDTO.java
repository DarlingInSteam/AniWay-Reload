package shadowshift.studio.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReadingProgressDTO {
    private Long id;
    private Long userId;
    private Long mangaId;
    private Long chapterId;
    private Double chapterNumber;
    private Integer pageNumber;
    private Boolean isCompleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Additional info for display
    private String mangaTitle;
    private String chapterTitle;
}
