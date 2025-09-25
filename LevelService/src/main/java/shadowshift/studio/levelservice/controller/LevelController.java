package shadowshift.studio.levelservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import shadowshift.studio.levelservice.entity.UserXp;
import shadowshift.studio.levelservice.entity.XpTransaction;
import shadowshift.studio.levelservice.repository.UserXpRepository;
import shadowshift.studio.levelservice.repository.XpTransactionRepository;
import shadowshift.studio.levelservice.service.XpFormulaService;
import shadowshift.studio.levelservice.repository.UserBadgeRepository;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/levels")
@RequiredArgsConstructor
public class LevelController {

    private final UserXpRepository userXpRepository;
    private final XpTransactionRepository xpTransactionRepository;
    private final XpFormulaService formulaService;
    private final UserBadgeRepository userBadgeRepository;

    @GetMapping("/{userId}")
    public ResponseEntity<?> getUserLevel(@PathVariable Long userId) {
        UserXp user = userXpRepository.findById(userId)
                .orElseGet(() -> null);
        if (user == null) {
            // User has no XP yet -> level 1 defaults
            Map<String, Object> resp = new HashMap<>();
            resp.put("userId", userId);
            resp.put("level", 1);
            resp.put("totalXp", 0L);
            resp.put("xpForNextLevel", formulaService.xpRequiredForLevel(1));
            resp.put("xpIntoCurrentLevel", 0L);
            resp.put("progress", 0.0);
            return ResponseEntity.ok(resp);
        }

        long xpIntoCurrent = formulaService.xpIntoCurrentLevel(user.getTotalXp());
        long xpForNext = user.getXpForNextLevel();
        double progress = xpForNext == 0 ? 1.0 : Math.min(1.0, (double) xpIntoCurrent / (double) xpForNext);

        Map<String, Object> resp = new HashMap<>();
        resp.put("userId", user.getUserId());
        resp.put("level", user.getLevel());
        resp.put("totalXp", user.getTotalXp());
        resp.put("xpForNextLevel", xpForNext);
        resp.put("xpIntoCurrentLevel", xpIntoCurrent);
        resp.put("progress", progress);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/{userId}/transactions")
    public ResponseEntity<?> getUserTransactions(@PathVariable Long userId,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100));
        Page<XpTransaction> txPage = xpTransactionRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return ResponseEntity.ok(txPage);
    }

    @GetMapping("/{userId}/badges")
    public ResponseEntity<?> getUserBadges(@PathVariable Long userId) {
        var badges = userBadgeRepository.findByUserId(userId);
        // minimal metadata; can be extended to localized names
        var resp = badges.stream().map(b -> Map.of(
                "badgeCode", b.getBadgeCode(),
                "awardedAt", b.getAwardedAt()
        )).toList();
        return ResponseEntity.ok(resp);
    }
}
