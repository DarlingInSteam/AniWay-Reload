package shadowshift.studio.friendservice.exception;

import org.springframework.http.HttpStatus;

public class FriendshipAlreadyExistsException extends FriendServiceException {
    public FriendshipAlreadyExistsException(Long userId, Long targetUserId) {
        super(HttpStatus.CONFLICT, "Пользователи %d и %d уже являются друзьями".formatted(userId, targetUserId));
    }
}
