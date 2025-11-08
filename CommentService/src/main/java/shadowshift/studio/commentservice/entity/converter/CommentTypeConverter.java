package shadowshift.studio.commentservice.entity.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import lombok.extern.slf4j.Slf4j;
import shadowshift.studio.commentservice.enums.CommentType;

import java.util.Locale;
import java.util.Map;

/**
 * Converts comment type enum values to database representation and back, handling
 * legacy string values gracefully so historical rows do not break deserialization.
 */
@Slf4j
@Converter(autoApply = true)
public class CommentTypeConverter implements AttributeConverter<CommentType, String> {

    private static final Map<String, CommentType> LEGACY_ALIASES = Map.ofEntries(
            Map.entry("PROFILE_COMMENT", CommentType.PROFILE),
            Map.entry("PROFILE_FEED", CommentType.PROFILE),
            Map.entry("USER_PROFILE", CommentType.PROFILE),
            Map.entry("MANGA_COMMENT", CommentType.MANGA),
            Map.entry("CHAPTER_COMMENT", CommentType.CHAPTER),
            Map.entry("REVIEW_COMMENT", CommentType.REVIEW),
            Map.entry("POST_COMMENT", CommentType.POST),
            Map.entry("MOMENT_COMMENT", CommentType.MOMENT)
    );

    @Override
    public String convertToDatabaseColumn(CommentType attribute) {
        return attribute != null ? attribute.name() : null;
    }

    @Override
    public CommentType convertToEntityAttribute(String dbData) {
        if (dbData == null) {
            return null;
        }
        String normalized = dbData.trim().toUpperCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            return null;
        }
        CommentType alias = LEGACY_ALIASES.get(normalized);
        if (alias != null) {
            return alias;
        }
        try {
            return CommentType.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            log.warn("Unknown comment type '{}' encountered in database, defaulting to POST", dbData);
            return CommentType.POST;
        }
    }
}
