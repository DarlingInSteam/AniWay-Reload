package shadowshift.studio.parserservice.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Утилиты для построения запросов к MangaLib API
 */
public final class MangaLibApiHelper {

    private static final Set<Integer> RETRYABLE_STATUS_CODES = Set.of(408, 409, 423, 425, 429, 500, 502, 503, 504);

    private MangaLibApiHelper() {
    }

    public static List<String> buildChapterUrlVariants(
            String apiBase,
            String slugWithId,
            String chapterId,
            Double number,
            Integer volume,
            Integer branchId,
            Integer defaultBranchId
    ) {
        String baseEndpoint = apiBase + "/manga/" + slugWithId + "/chapter";
        String numberValue = formatDecimal(number);
        String volumeValue = formatVolume(volume);
        if (volumeValue == null || volumeValue.isEmpty()) {
            volumeValue = "1";
        }
        String chapterIdValue = normalize(chapterId);
        String branchValue = null;
        if (branchId != null && !branchId.equals(defaultBranchId)) {
            branchValue = String.valueOf(branchId);
        }

        List<String> variants = new ArrayList<>();
        extendVariants(baseEndpoint, variants, numberValue, volumeValue, chapterIdValue, branchValue, true);
        extendVariants(baseEndpoint, variants, numberValue, volumeValue, chapterIdValue, branchValue, false);

        return new ArrayList<>(new LinkedHashSet<>(variants));
    }

    private static void extendVariants(String baseEndpoint,
                                       List<String> variants,
                                       String numberValue,
                                       String volumeValue,
                                       String chapterIdValue,
                                       String branchValue,
                                       boolean includeBranch) {
        String branchParam = includeBranch ? branchValue : null;

        String firstQuery = buildQuery(baseEndpoint, params(
                "number", numberValue,
                "volume", volumeValue,
                "branch_id", branchParam
        ));
        if (firstQuery != null) {
            variants.add(firstQuery);
        }

        if (chapterIdValue != null) {
            String pathVariant = appendQuery(baseEndpoint + "/" + chapterIdValue, params(
                    "branch_id", branchParam,
                    "volume", volumeValue,
                    "number", numberValue
            ));
            variants.add(pathVariant);

            String chapterIdQuery = buildQuery(baseEndpoint, params(
                    "chapter_id", chapterIdValue,
                    "branch_id", branchParam,
                    "volume", volumeValue,
                    "number", numberValue
            ));
            if (chapterIdQuery != null) {
                variants.add(chapterIdQuery);
            }

            String genericIdQuery = buildQuery(baseEndpoint, params(
                    "id", chapterIdValue,
                    "branch_id", branchParam,
                    "volume", volumeValue,
                    "number", numberValue
            ));
            if (genericIdQuery != null) {
                variants.add(genericIdQuery);
            }
        }

        String fallbackQuery = buildQuery(baseEndpoint, params(
                "branch_id", branchParam,
                "id", chapterIdValue,
                "volume", volumeValue,
                "number", numberValue
        ));
        if (fallbackQuery != null) {
            variants.add(fallbackQuery);
        }
    }

    private static Map<String, String> params(String... keyValues) {
        Map<String, String> map = new LinkedHashMap<>();
        if (keyValues == null) {
            return map;
        }
        if (keyValues.length % 2 != 0) {
            throw new IllegalArgumentException("Пары ключ-значение должны иметь четное количество элементов");
        }
        for (int i = 0; i < keyValues.length; i += 2) {
            String key = keyValues[i];
            String value = keyValues[i + 1];
            if (key == null) {
                continue;
            }
            if (value == null || value.isEmpty()) {
                continue;
            }
            map.put(key, value);
        }
        return map;
    }

    private static String appendQuery(String base, Map<String, String> params) {
        String query = buildQuery(null, params);
        if (query == null || query.isEmpty()) {
            return base;
        }
        String separator = base.contains("?") ? "&" : "?";
        return base + separator + query;
    }

    private static String buildQuery(String base, Map<String, String> params) {
        StringBuilder builder = new StringBuilder();
        for (Map.Entry<String, String> entry : params.entrySet()) {
            String key = entry.getKey();
            String value = entry.getValue();
            if (value == null || value.isEmpty()) {
                continue;
            }
            if (builder.length() > 0) {
                builder.append('&');
            }
            builder.append(key).append('=').append(value);
        }
        if (builder.length() == 0) {
            return base;
        }
        if (base == null) {
            return builder.toString();
        }
        return base + '?' + builder;
    }

    private static String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public static String formatDecimal(Double value) {
        if (value == null) {
            return null;
        }
        BigDecimal decimal = BigDecimal.valueOf(value).stripTrailingZeros();
        if (decimal.scale() < 0) {
            decimal = decimal.setScale(0, RoundingMode.UNNECESSARY);
        }
        return decimal.toPlainString();
    }

    public static String formatVolume(Integer value) {
        if (value == null) {
            return null;
        }
        return String.format(Locale.ROOT, "%d", value);
    }

    public static boolean isRetryableStatus(int statusCode) {
        return RETRYABLE_STATUS_CODES.contains(statusCode);
    }

    public static String normalizeToken(String token) {
        if (token == null) {
            return null;
        }
        String trimmed = token.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.toLowerCase(Locale.ROOT).startsWith("bearer ")) {
            return trimmed;
        }
        return "Bearer " + trimmed;
    }
}
