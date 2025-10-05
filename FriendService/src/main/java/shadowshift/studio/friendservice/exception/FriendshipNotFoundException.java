package shadowshift.studio.friendservice.exception;

import org.springframework.http.HttpStatus;

public class FriendshipNotFoundException extends FriendServiceException {
    public FriendshipNotFoundException(Long friendId) {
        super(HttpStatus.NOT_FOUND, "Дружба с пользователем %d не найдена".formatted(friendId));
    }
}
