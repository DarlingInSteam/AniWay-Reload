package shadowshift.studio.mangaservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

/**
 * Response DTO для batch endpoint /chapter-images/{manga}/{chapter} в MelonService.
 * Содержит все изображения главы в одном ответе для оптимизации.
 */
public class MelonChapterImagesResponse {
    
    /**
     * Список всех изображений главы
     */
    @JsonProperty("images")
    private List<MelonImageData> images;
    
    /**
     * Общее количество изображений
     */
    @JsonProperty("total")
    private Integer total;
    
    public MelonChapterImagesResponse() {
    }
    
    public MelonChapterImagesResponse(List<MelonImageData> images, Integer total) {
        this.images = images;
        this.total = total;
    }
    
    public List<MelonImageData> getImages() {
        return images;
    }
    
    public void setImages(List<MelonImageData> images) {
        this.images = images;
    }
    
    public Integer getTotal() {
        return total;
    }
    
    public void setTotal(Integer total) {
        this.total = total;
    }
}
