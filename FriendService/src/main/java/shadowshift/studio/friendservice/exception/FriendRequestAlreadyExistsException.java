package shadowshift.studio.friendservice.exception;

import org.springframework.http.HttpStatus;

public class FriendRequestAlreadyExistsException extends FriendServiceException {
    public FriendRequestAlreadyExistsException(Long requesterId, Long receiverId) {
        super(HttpStatus.CONFLICT, "Заявка в друзья уже существует для пользователей %d и %d".formatted(requesterId, receiverId));
    }
}
