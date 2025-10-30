package shadowshift.studio.imagestorageservice.dto;

public class MomentImageUploadResponseDTO {

    private final String url;
    private final String key;
    private final Integer width;
    private final Integer height;
    private final long sizeBytes;

    public MomentImageUploadResponseDTO(String url, String key, Integer width, Integer height, long sizeBytes) {
        this.url = url;
        this.key = key;
        this.width = width;
        this.height = height;
        this.sizeBytes = sizeBytes;
    }

    public String getUrl() {
        return url;
    }

    public String getKey() {
        return key;
    }

    public Integer getWidth() {
        return width;
    }

    public Integer getHeight() {
        return height;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }
}
