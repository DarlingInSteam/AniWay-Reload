package shadowshift.studio.parserservice.util;

import java.math.BigDecimal;

/**
 * Utility for producing stable keys used to match chapters by volume/number pairs.
 */
public final class ChapterKeyUtil {

    private static final String SEPARATOR = "::";

    private ChapterKeyUtil() {
    }

    public static String encode(Integer volume, Double number) {
        if (number == null) {
            return null;
        }
        int safeVolume = volume != null ? volume : 0;
        BigDecimal normalized = BigDecimal.valueOf(number).stripTrailingZeros();
        return safeVolume + SEPARATOR + normalized.toPlainString();
    }
}
