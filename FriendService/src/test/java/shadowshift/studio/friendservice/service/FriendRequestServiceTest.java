package shadowshift.studio.friendservice.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import shadowshift.studio.friendservice.dto.CreateFriendRequestPayload;
import shadowshift.studio.friendservice.dto.FriendRequestView;
import shadowshift.studio.friendservice.entity.FriendRequestEntity;
import shadowshift.studio.friendservice.exception.FriendRequestForbiddenActionException;
import shadowshift.studio.friendservice.exception.FriendshipAlreadyExistsException;
import shadowshift.studio.friendservice.model.FriendRequestStatus;
import shadowshift.studio.friendservice.notification.FriendNotificationPublisher;
import shadowshift.studio.friendservice.repository.FriendRequestRepository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.StreamSupport;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FriendRequestServiceTest {

    @Mock
    private FriendRequestRepository friendRequestRepository;

    @Mock
    private FriendshipService friendshipService;

    @Mock
    private FriendNotificationPublisher notificationPublisher;

    @InjectMocks
    private FriendRequestService friendRequestService;

    private FriendRequestEntity pending;

    @BeforeEach
    void setup() {
        pending = FriendRequestEntity.builder()
                .id(UUID.randomUUID())
                .requesterId(1L)
                .receiverId(2L)
                .status(FriendRequestStatus.PENDING)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
    }

    @Test
    void createRequestPersistsNewRequest() {
        when(friendshipService.areFriends(1L, 3L)).thenReturn(false);
        when(friendRequestRepository.findByRequesterIdAndReceiverIdAndStatus(1L, 3L, FriendRequestStatus.PENDING)).thenReturn(Optional.empty());
        when(friendRequestRepository.findByRequesterIdAndReceiverIdAndStatus(3L, 1L, FriendRequestStatus.PENDING)).thenReturn(Optional.empty());
        when(friendRequestRepository.save(any(FriendRequestEntity.class))).thenAnswer(invocation -> {
            FriendRequestEntity entity = invocation.getArgument(0);
            entity.setCreatedAt(OffsetDateTime.now());
            entity.setUpdatedAt(OffsetDateTime.now());
            return entity;
        });

        FriendRequestView view = friendRequestService.createRequest(1L, new CreateFriendRequestPayload(3L, "Привет"));

        assertThat(view.requesterId()).isEqualTo(1L);
        verify(friendRequestRepository).save(any(FriendRequestEntity.class));
        verify(notificationPublisher).publishFriendRequestReceived(eq(3L), eq(1L), any(UUID.class), eq("Привет"));
    }

    @Test
    void createRequestAutoAcceptsOpposite() {
        FriendRequestEntity opposite = FriendRequestEntity.builder()
                .id(UUID.randomUUID())
                .requesterId(3L)
                .receiverId(1L)
                .status(FriendRequestStatus.PENDING)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();

        when(friendshipService.areFriends(1L, 3L)).thenReturn(false);
        when(friendRequestRepository.findByRequesterIdAndReceiverIdAndStatus(1L, 3L, FriendRequestStatus.PENDING)).thenReturn(Optional.empty());
        when(friendRequestRepository.findByRequesterIdAndReceiverIdAndStatus(3L, 1L, FriendRequestStatus.PENDING)).thenReturn(Optional.of(opposite));
        when(friendRequestRepository.save(opposite)).thenReturn(opposite);

        FriendRequestView view = friendRequestService.createRequest(1L, new CreateFriendRequestPayload(3L, null));

        assertThat(view.status()).isEqualTo(FriendRequestStatus.ACCEPTED.name());
        verify(notificationPublisher).publishFriendRequestAccepted(3L, 1L, opposite.getId());
    }

    @Test
    void createRequestFailsWhenAlreadyFriends() {
        when(friendshipService.areFriends(1L, 2L)).thenReturn(true);
        assertThatThrownBy(() -> friendRequestService.createRequest(1L, new CreateFriendRequestPayload(2L, null)))
                .isInstanceOf(FriendshipAlreadyExistsException.class);
        verify(friendRequestRepository, never()).save(any());
    }

    @Test
    void acceptRequestValidatesReceiver() {
        when(friendRequestRepository.findById(pending.getId())).thenReturn(Optional.of(pending));
        assertThatThrownBy(() -> friendRequestService.acceptRequest(999L, pending.getId()))
                .isInstanceOf(FriendRequestForbiddenActionException.class);
    }

    @Test
    void acceptRequestRemovesLegacyAcceptedBeforeSaving() {
    FriendRequestEntity previous = FriendRequestEntity.builder()
        .id(UUID.randomUUID())
        .requesterId(1L)
        .receiverId(2L)
        .status(FriendRequestStatus.ACCEPTED)
        .createdAt(OffsetDateTime.now())
        .updatedAt(OffsetDateTime.now())
        .build();

    when(friendRequestRepository.findById(pending.getId())).thenReturn(Optional.of(pending));
    when(friendRequestRepository.findByRequesterIdAndReceiverIdAndStatus(1L, 2L, FriendRequestStatus.ACCEPTED)).thenReturn(Optional.of(previous));
    when(friendRequestRepository.findByRequesterIdAndReceiverIdAndStatus(2L, 1L, FriendRequestStatus.ACCEPTED)).thenReturn(Optional.empty());
    when(friendRequestRepository.save(pending)).thenReturn(pending);
    when(friendshipService.ensureFriendship(anyLong(), anyLong(), any(UUID.class))).thenReturn(null);

    friendRequestService.acceptRequest(2L, pending.getId());

    verify(friendRequestRepository).deleteAllById(argThat(ids ->
        StreamSupport.stream(ids.spliterator(), false)
            .anyMatch(previous.getId()::equals)));
    verify(friendRequestRepository).flush();
    }
}
