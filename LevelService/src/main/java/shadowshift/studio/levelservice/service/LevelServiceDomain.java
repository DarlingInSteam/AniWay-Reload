package shadowshift.studio.levelservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.levelservice.entity.UserXp;
import shadowshift.studio.levelservice.entity.XpTransaction;
import shadowshift.studio.levelservice.repository.UserXpRepository;
import shadowshift.studio.levelservice.repository.XpTransactionRepository;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class LevelServiceDomain {

    private final UserXpRepository userXpRepository;
    private final XpTransactionRepository xpTransactionRepository;
    private final XpFormulaService formulaService;

    @Transactional
    public UserXp addXp(Long userId, long amount, String sourceType, String sourceId, String eventId) {
        // idempotency check
        if (xpTransactionRepository.findByEventId(eventId).isPresent()) {
            return userXpRepository.findById(userId).orElseGet(() -> initUser(userId));
        }

        UserXp user = userXpRepository.findById(userId).orElseGet(() -> initUser(userId));
        user.setTotalXp(user.getTotalXp() + amount);
        user.setLevel(formulaService.levelForTotalXp(user.getTotalXp()));
        user.setXpForNextLevel(formulaService.xpForNextLevel(user.getTotalXp()));
        user.setUpdatedAt(LocalDateTime.now());
        userXpRepository.save(user);

        XpTransaction tx = XpTransaction.builder()
                .userId(userId)
                .xpAmount(amount)
                .sourceType(sourceType)
                .sourceId(sourceId)
                .eventId(eventId)
                .createdAt(LocalDateTime.now())
                .build();
        xpTransactionRepository.save(tx);

        return user;
    }

    public UserXp initUser(Long userId) {
        UserXp user = UserXp.builder()
                .userId(userId)
                .totalXp(0)
                .level(1)
                .xpForNextLevel(formulaService.xpForNextLevel(0))
                .updatedAt(LocalDateTime.now())
                .build();
        return userXpRepository.save(user);
    }
}
