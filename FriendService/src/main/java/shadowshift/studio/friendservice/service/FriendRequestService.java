package shadowshift.studio.friendservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import shadowshift.studio.friendservice.dto.CreateFriendRequestPayload;
import shadowshift.studio.friendservice.dto.FriendRequestView;
import shadowshift.studio.friendservice.entity.FriendRequestEntity;
import shadowshift.studio.friendservice.exception.FriendRequestAlreadyProcessedException;
import shadowshift.studio.friendservice.exception.FriendRequestForbiddenActionException;
import shadowshift.studio.friendservice.exception.FriendRequestNotFoundException;
import shadowshift.studio.friendservice.exception.FriendshipAlreadyExistsException;
import shadowshift.studio.friendservice.exception.InvalidFriendRequestException;
import shadowshift.studio.friendservice.exception.SelfFriendRequestException;
import shadowshift.studio.friendservice.model.FriendRequestStatus;
import shadowshift.studio.friendservice.notification.FriendNotificationPublisher;
import shadowshift.studio.friendservice.repository.FriendRequestRepository;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FriendRequestService {

    private final FriendRequestRepository friendRequestRepository;
    private final FriendshipService friendshipService;
    private final FriendNotificationPublisher notificationPublisher;

    @Transactional
    public FriendRequestView createRequest(Long requesterId, CreateFriendRequestPayload payload) {
        Long targetUserId = payload.targetUserId();
        validateRequester(requesterId, targetUserId);

        String message = sanitiseMessage(payload.message());

        if (friendshipService.areFriends(requesterId, targetUserId)) {
            throw new FriendshipAlreadyExistsException(requesterId, targetUserId);
        }

        // Existing outgoing request - update context
        FriendRequestEntity existingOutgoing = friendRequestRepository
                .findByRequesterIdAndReceiverIdAndStatus(requesterId, targetUserId, FriendRequestStatus.PENDING)
                .map(entity -> updateMessage(entity, message))
                .orElse(null);
        if (existingOutgoing != null) {
            return toView(existingOutgoing);
        }

        // Auto-accept if opposite request pending
        FriendRequestEntity opposite = friendRequestRepository
                .findByRequesterIdAndReceiverIdAndStatus(targetUserId, requesterId, FriendRequestStatus.PENDING)
                .orElse(null);
        if (opposite != null) {
            cleanupLegacyAccepted(opposite.getRequesterId(), opposite.getReceiverId(), opposite.getId());
            opposite.markAccepted();
            FriendRequestEntity saved = friendRequestRepository.save(opposite);
            friendshipService.ensureFriendship(opposite.getRequesterId(), opposite.getReceiverId(), opposite.getId());
            notificationPublisher.publishFriendRequestAccepted(opposite.getRequesterId(), opposite.getReceiverId(), opposite.getId());
            return toView(saved);
        }

        FriendRequestEntity entity = FriendRequestEntity.builder()
                .id(UUID.randomUUID())
                .requesterId(requesterId)
                .receiverId(targetUserId)
                .status(FriendRequestStatus.PENDING)
                .context(message)
                .build();
        FriendRequestEntity saved = friendRequestRepository.save(entity);
        notificationPublisher.publishFriendRequestReceived(saved.getReceiverId(), saved.getRequesterId(), saved.getId(), saved.getContext());
        return toView(saved);
    }

    @Transactional
    public FriendRequestView acceptRequest(Long receiverId, UUID requestId) {
        FriendRequestEntity request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new FriendRequestNotFoundException(requestId));
        if (!Objects.equals(request.getReceiverId(), receiverId)) {
            throw new FriendRequestForbiddenActionException();
        }
        if (!request.isPending()) {
            throw new FriendRequestAlreadyProcessedException();
        }
        cleanupLegacyAccepted(request.getRequesterId(), request.getReceiverId(), request.getId());
        request.markAccepted();
        FriendRequestEntity saved = friendRequestRepository.save(request);
        friendshipService.ensureFriendship(saved.getRequesterId(), saved.getReceiverId(), saved.getId());
        notificationPublisher.publishFriendRequestAccepted(saved.getRequesterId(), saved.getReceiverId(), saved.getId());
        return toView(saved);
    }

    @Transactional
    public FriendRequestView declineRequest(Long receiverId, UUID requestId) {
        FriendRequestEntity request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new FriendRequestNotFoundException(requestId));
        if (!Objects.equals(request.getReceiverId(), receiverId)) {
            throw new FriendRequestForbiddenActionException();
        }
        if (!request.isPending()) {
            throw new FriendRequestAlreadyProcessedException();
        }
        request.markDeclined();
        FriendRequestEntity saved = friendRequestRepository.save(request);
        return toView(saved);
    }

    @Transactional(readOnly = true)
    public List<FriendRequestView> getIncomingRequests(Long userId) {
        return friendRequestRepository.findByReceiverIdAndStatusOrderByCreatedAtDesc(userId, FriendRequestStatus.PENDING)
                .stream()
                .map(this::toView)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FriendRequestView> getOutgoingRequests(Long userId) {
        return friendRequestRepository.findByRequesterIdAndStatusOrderByCreatedAtDesc(userId, FriendRequestStatus.PENDING)
                .stream()
                .map(this::toView)
                .toList();
    }

    @Transactional(readOnly = true)
    public long countIncoming(Long userId) {
        return friendRequestRepository.countByReceiverIdAndStatus(userId, FriendRequestStatus.PENDING);
    }

    @Transactional(readOnly = true)
    public long countOutgoing(Long userId) {
        return friendRequestRepository.countByRequesterIdAndStatus(userId, FriendRequestStatus.PENDING);
    }

    private void validateRequester(Long requesterId, Long targetUserId) {
        if (requesterId == null || requesterId <= 0) {
            throw new FriendRequestForbiddenActionException();
        }
        if (targetUserId == null || targetUserId <= 0) {
            throw new InvalidFriendRequestException("Целевой пользователь не указан или указан неверно");
        }
        if (Objects.equals(requesterId, targetUserId)) {
            throw new SelfFriendRequestException();
        }
    }

    private FriendRequestEntity updateMessage(FriendRequestEntity entity, String message) {
        entity.setContext(message);
        entity.setUpdatedAt(OffsetDateTime.now());
        return friendRequestRepository.save(entity);
    }

    private String sanitiseMessage(String message) {
        if (message == null) {
            return null;
        }
        String trimmed = message.trim();
        return trimmed.isBlank() ? null : trimmed;
    }

    private FriendRequestView toView(FriendRequestEntity entity) {
        return new FriendRequestView(
                entity.getId(),
                entity.getRequesterId(),
                entity.getReceiverId(),
                entity.getStatus().name(),
                entity.getContext(),
                toInstant(entity.getCreatedAt()),
                toInstant(entity.getUpdatedAt()),
                toInstant(entity.getRespondedAt())
        );
    }

    private Instant toInstant(OffsetDateTime time) {
        return time != null ? time.toInstant() : null;
    }

    private void cleanupLegacyAccepted(Long requesterId, Long receiverId, UUID currentRequestId) {
        Set<UUID> duplicates = new LinkedHashSet<>();
        friendRequestRepository.findByRequesterIdAndReceiverIdAndStatus(requesterId, receiverId, FriendRequestStatus.ACCEPTED)
                .ifPresent(existing -> {
                    if (!existing.getId().equals(currentRequestId)) {
                        duplicates.add(existing.getId());
                    }
                });
        friendRequestRepository.findByRequesterIdAndReceiverIdAndStatus(receiverId, requesterId, FriendRequestStatus.ACCEPTED)
                .ifPresent(existing -> {
                    if (!existing.getId().equals(currentRequestId)) {
                        duplicates.add(existing.getId());
                    }
                });
        if (!duplicates.isEmpty()) {
            friendRequestRepository.deleteAllById(duplicates);
            friendRequestRepository.flush();
        }
    }
}
