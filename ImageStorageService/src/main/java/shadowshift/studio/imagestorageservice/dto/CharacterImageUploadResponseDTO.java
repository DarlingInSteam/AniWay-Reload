package shadowshift.studio.imagestorageservice.dto;

/**
 * DTO describing the outcome of an uploaded character image stored in MinIO.
 */
public class CharacterImageUploadResponseDTO {

    private final String url;
    private final String key;
    private final Integer width;
    private final Integer height;
    private final long sizeBytes;
    private final Long mangaId;
    private final Long characterId;
    private final Long uploadedBy;

    public CharacterImageUploadResponseDTO(String url,
                                           String key,
                                           Integer width,
                                           Integer height,
                                           long sizeBytes,
                                           Long mangaId,
                                           Long characterId,
                                           Long uploadedBy) {
        this.url = url;
        this.key = key;
        this.width = width;
        this.height = height;
        this.sizeBytes = sizeBytes;
        this.mangaId = mangaId;
        this.characterId = characterId;
        this.uploadedBy = uploadedBy;
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

    public Long getMangaId() {
        return mangaId;
    }

    public Long getCharacterId() {
        return characterId;
    }

    public Long getUploadedBy() {
        return uploadedBy;
    }
}
