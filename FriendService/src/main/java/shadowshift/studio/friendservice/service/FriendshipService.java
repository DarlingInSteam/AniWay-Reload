package shadowshift.studio.friendservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.friendservice.dto.FriendView;
import shadowshift.studio.friendservice.entity.FriendshipEntity;
import shadowshift.studio.friendservice.exception.FriendshipNotFoundException;
import shadowshift.studio.friendservice.repository.FriendshipRepository;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;

    @Transactional(readOnly = true)
    public boolean areFriends(Long userId, Long otherUserId) {
        Pair pair = normalize(userId, otherUserId);
        return friendshipRepository.existsByUserAIdAndUserBId(pair.userAId(), pair.userBId());
    }

    @Transactional
    public FriendshipEntity ensureFriendship(Long requesterId, Long receiverId, UUID requestId) {
        Pair pair = normalize(requesterId, receiverId);
        return friendshipRepository.findByUserAIdAndUserBId(pair.userAId(), pair.userBId())
                .map(existing -> {
                    if (existing.getSourceRequestId() == null) {
                        existing.setSourceRequestId(requestId);
                    }
                    return existing;
                })
                .orElseGet(() -> {
                    FriendshipEntity entity = FriendshipEntity.builder()
                            .userAId(pair.userAId())
                            .userBId(pair.userBId())
                            .sourceRequestId(requestId)
                            .build();
                    return friendshipRepository.save(entity);
                });
    }

    @Transactional(readOnly = true)
    public List<FriendView> listFriends(Long userId) {
        return friendshipRepository.findAllByUserOrderByCreatedAtDesc(userId).stream()
                .map(entity -> new FriendView(
                        entity.friendIdFor(userId),
                        toInstant(entity.getCreatedAt()),
                        entity.getSourceRequestId()
                ))
                .toList();
    }

    @Transactional
    public void removeFriendship(Long userId, Long friendUserId) {
        Pair pair = normalize(userId, friendUserId);
        if (!friendshipRepository.existsByUserAIdAndUserBId(pair.userAId(), pair.userBId())) {
            throw new FriendshipNotFoundException(friendUserId);
        }
        friendshipRepository.deleteByUserAIdAndUserBId(pair.userAId(), pair.userBId());
    }

    @Transactional(readOnly = true)
    public long countFriends(Long userId) {
        return friendshipRepository.countByUser(userId);
    }

    private Pair normalize(Long first, Long second) {
        if (first == null || second == null) {
            throw new IllegalArgumentException("Идентификаторы пользователей не могут быть пустыми");
        }
        long a = Math.min(first, second);
        long b = Math.max(first, second);
        return new Pair(a, b);
    }

    private Instant toInstant(OffsetDateTime dateTime) {
        return dateTime != null ? dateTime.toInstant() : null;
    }

    private record Pair(Long userAId, Long userBId) {}
}
