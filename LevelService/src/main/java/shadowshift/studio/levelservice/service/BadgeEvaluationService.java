package shadowshift.studio.levelservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.levelservice.entity.UserBadge;
import shadowshift.studio.levelservice.repository.UserBadgeRepository;
import shadowshift.studio.levelservice.repository.XpTransactionRepository;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Evaluates and awards badges based on XP transactions and auxiliary counts.
 * Rules:
 *  - FIRST_LIKE_RECEIVED: first LIKE_RECEIVED|POST_UPVOTED|CHAPTER_LIKE_RECEIVED transaction.
 *  - TEN_COMMENTS: 10 COMMENT_CREATED transactions.
 *  - HUNDRED_CHAPTERS: 100 CHAPTER_READ transactions (unique ensured upstream).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BadgeEvaluationService {

    private final UserBadgeRepository userBadgeRepository;
    private final XpTransactionRepository xpTransactionRepository;

    private static final String BADGE_FIRST_LIKE = "FIRST_LIKE_RECEIVED";
    private static final String BADGE_FIRST_COMMENT = "FIRST_COMMENT";
    private static final String BADGE_TEN_COMMENTS = "TEN_COMMENTS";
    private static final String BADGE_HUNDRED_CHAPTERS = "HUNDRED_CHAPTERS";

    private static final Set<String> LIKE_SOURCES = Set.of("LIKE_RECEIVED", "POST_UPVOTED", "CHAPTER_LIKE_RECEIVED");

    @Transactional
    public List<UserBadge> evaluateUser(Long userId) {
        List<UserBadge> newlyAwarded = new ArrayList<>();

        // FIRST_LIKE_RECEIVED
        if (!userBadgeRepository.existsByUserIdAndBadgeCode(userId, BADGE_FIRST_LIKE)) {
            boolean hasAnyLike = xpTransactionRepository
                    .findByUserIdOrderByCreatedAtDesc(userId, org.springframework.data.domain.PageRequest.of(0, 500))
                    .stream()
                    .anyMatch(tx -> LIKE_SOURCES.contains(tx.getSourceType()));
            if (hasAnyLike) {
                newlyAwarded.add(saveBadge(userId, BADGE_FIRST_LIKE));
            }
        }

        // FIRST_COMMENT
        if (!userBadgeRepository.existsByUserIdAndBadgeCode(userId, BADGE_FIRST_COMMENT)) {
            boolean hasFirstComment = xpTransactionRepository
                    .findByUserIdOrderByCreatedAtDesc(userId, org.springframework.data.domain.PageRequest.of(0, 200))
                    .stream()
                    .anyMatch(tx -> "COMMENT_CREATED".equals(tx.getSourceType()));
            if (hasFirstComment) {
                newlyAwarded.add(saveBadge(userId, BADGE_FIRST_COMMENT));
            }
        }

        // TEN_COMMENTS
        if (!userBadgeRepository.existsByUserIdAndBadgeCode(userId, BADGE_TEN_COMMENTS)) {
            long commentCount = xpTransactionRepository
                    .findByUserIdOrderByCreatedAtDesc(userId, org.springframework.data.domain.PageRequest.of(0, 1000))
                    .stream()
                    .filter(tx -> "COMMENT_CREATED".equals(tx.getSourceType()))
                    .count();
            if (commentCount >= 10) {
                newlyAwarded.add(saveBadge(userId, BADGE_TEN_COMMENTS));
            }
        }

        // HUNDRED_CHAPTERS
        if (!userBadgeRepository.existsByUserIdAndBadgeCode(userId, BADGE_HUNDRED_CHAPTERS)) {
            long chapterReadCount = xpTransactionRepository
                    .findByUserIdOrderByCreatedAtDesc(userId, org.springframework.data.domain.PageRequest.of(0, 2000))
                    .stream()
                    .filter(tx -> "CHAPTER_READ".equals(tx.getSourceType()))
                    .count();
            if (chapterReadCount >= 100) {
                newlyAwarded.add(saveBadge(userId, BADGE_HUNDRED_CHAPTERS));
            }
        }

        return newlyAwarded;
    }

    private UserBadge saveBadge(Long userId, String badgeCode) {
        UserBadge badge = UserBadge.builder()
                .userId(userId)
                .badgeCode(badgeCode)
                .awardedAt(LocalDateTime.now())
                .build();
        userBadgeRepository.save(badge);
        log.info("Awarded badge {} to user {}", badgeCode, userId);
        return badge;
    }
}
