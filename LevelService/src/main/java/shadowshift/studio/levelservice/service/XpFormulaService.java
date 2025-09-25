package shadowshift.studio.levelservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class XpFormulaService {

    @Value("${leveling.formula.base:50}")
    private double base;

    @Value("${leveling.formula.exponent:1.6}")
    private double exponent;

    public long xpRequiredForLevel(int level) {
        return Math.round(base * Math.pow(level, exponent));
    }

    public int levelForTotalXp(long totalXp) {
        int level = 1;
        long accumulated = 0;
        while (true) {
            long needed = xpRequiredForLevel(level);
            if (accumulated + needed > totalXp) {
                return level; // current level not fully completed yet
            }
            accumulated += needed;
            level++;
            // safety cap
            if (level > 1000) return 1000;
        }
    }

    public long xpIntoCurrentLevel(long totalXp) {
        int level = 1;
        long accumulated = 0;
        while (true) {
            long needed = xpRequiredForLevel(level);
            if (accumulated + needed > totalXp) {
                return totalXp - accumulated;
            }
            accumulated += needed;
            level++;
            if (level > 1000) return 0;
        }
    }

    public long xpForNextLevel(long totalXp) {
        int level = levelForTotalXp(totalXp);
        return xpRequiredForLevel(level);
    }
}
