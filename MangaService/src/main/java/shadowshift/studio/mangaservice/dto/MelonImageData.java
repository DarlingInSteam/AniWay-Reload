package shadowshift.studio.mangaservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DTO для одного изображения из MelonService batch endpoint.
 * Содержит base64-кодированные данные изображения.
 */
public class MelonImageData {
    
    /**
     * Номер страницы
     */
    @JsonProperty("page")
    private Integer page;
    
    /**
     * Base64-кодированные данные изображения
     */
    @JsonProperty("data")
    private String data;
    
    /**
     * Формат изображения (png, jpg, jpeg, webp)
     */
    @JsonProperty("format")
    private String format;
    
    public MelonImageData() {
    }
    
    public MelonImageData(Integer page, String data, String format) {
        this.page = page;
        this.data = data;
        this.format = format;
    }
    
    public Integer getPage() {
        return page;
    }
    
    public void setPage(Integer page) {
        this.page = page;
    }
    
    public String getData() {
        return data;
    }
    
    public void setData(String data) {
        this.data = data;
    }
    
    public String getFormat() {
        return format;
    }
    
    public void setFormat(String format) {
        this.format = format;
    }
}
