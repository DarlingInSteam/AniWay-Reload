package shadowshift.studio.friendservice.exception;

import org.springframework.http.HttpStatus;

public class FriendRequestForbiddenActionException extends FriendServiceException {
    public FriendRequestForbiddenActionException() {
        super(HttpStatus.FORBIDDEN, "Нет прав для выполнения действия с заявкой в друзья");
    }
}
