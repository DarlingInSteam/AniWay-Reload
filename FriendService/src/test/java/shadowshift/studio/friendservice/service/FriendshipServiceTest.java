package shadowshift.studio.friendservice.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import shadowshift.studio.friendservice.dto.FriendView;
import shadowshift.studio.friendservice.entity.FriendshipEntity;
import shadowshift.studio.friendservice.repository.FriendRequestRepository;
import shadowshift.studio.friendservice.exception.FriendshipNotFoundException;
import shadowshift.studio.friendservice.repository.FriendshipRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.stream.StreamSupport;

@ExtendWith(MockitoExtension.class)
class FriendshipServiceTest {

    @Mock
    private FriendshipRepository friendshipRepository;

    @Mock
    private FriendRequestRepository friendRequestRepository;

    @InjectMocks
    private FriendshipService friendshipService;

    private FriendshipEntity sample;

    @BeforeEach
    void setUp() {
        sample = FriendshipEntity.builder()
                .id(10L)
                .userAId(1L)
                .userBId(5L)
                .createdAt(OffsetDateTime.now())
                .sourceRequestId(UUID.randomUUID())
                .build();
    }

    @Test
    void areFriendsNormalizesPairBeforeLookup() {
        when(friendshipRepository.existsByUserAIdAndUserBId(1L, 5L)).thenReturn(true);
        boolean result = friendshipService.areFriends(5L, 1L);
        assertThat(result).isTrue();
        verify(friendshipRepository).existsByUserAIdAndUserBId(1L, 5L);
    }

    @Test
    void ensureFriendshipCreatesNewWhenMissing() {
        when(friendshipRepository.findByUserAIdAndUserBId(1L, 5L)).thenReturn(Optional.empty());
        when(friendshipRepository.save(any(FriendshipEntity.class))).thenAnswer(invocation -> {
            FriendshipEntity entity = invocation.getArgument(0);
            entity.setId(42L);
            entity.setCreatedAt(OffsetDateTime.now());
            return entity;
        });

        FriendshipEntity result = friendshipService.ensureFriendship(5L, 1L, UUID.randomUUID());

        assertThat(result.getUserAId()).isEqualTo(1L);
        assertThat(result.getUserBId()).isEqualTo(5L);
        verify(friendshipRepository).save(any(FriendshipEntity.class));
    }

    @Test
    void removeFriendshipThrowsWhenNotFound() {
        when(friendshipRepository.findByUserAIdAndUserBId(1L, 5L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> friendshipService.removeFriendship(1L, 5L))
                .isInstanceOf(FriendshipNotFoundException.class);
        verify(friendshipRepository, never()).delete(any());
    }

    @Test
    void removeFriendshipDeletesAssociatedRequests() {
        when(friendshipRepository.findByUserAIdAndUserBId(1L, 5L)).thenReturn(Optional.of(sample));

        friendshipService.removeFriendship(1L, 5L);

        verify(friendshipRepository).delete(sample);
    verify(friendRequestRepository).deleteAllById(argThat(ids ->
        StreamSupport.stream(ids.spliterator(), false)
            .anyMatch(sample.getSourceRequestId()::equals)));
    }

    @Test
    void listFriendsMapsToView() {
        when(friendshipRepository.findAllByUserOrderByCreatedAtDesc(1L)).thenReturn(List.of(sample));
        List<FriendView> views = friendshipService.listFriends(1L);
        assertThat(views).hasSize(1);
        assertThat(views.get(0).friendUserId()).isEqualTo(5L);
    }
}
