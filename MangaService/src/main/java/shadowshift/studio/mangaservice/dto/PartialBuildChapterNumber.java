package shadowshift.studio.mangaservice.dto;

/**
 * Represents a chapter selector for partial builds (volume + number).
 */
public record PartialBuildChapterNumber(Integer volume, Double number) {

    public static PartialBuildChapterNumber of(Integer volume, Double number) {
        if (number == null) {
            return null;
        }
        Integer safeVolume = volume != null ? volume : 0;
        return new PartialBuildChapterNumber(safeVolume, number);
    }
}
