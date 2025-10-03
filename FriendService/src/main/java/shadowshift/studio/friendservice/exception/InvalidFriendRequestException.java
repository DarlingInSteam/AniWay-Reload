package shadowshift.studio.friendservice.exception;

import org.springframework.http.HttpStatus;

public class InvalidFriendRequestException extends FriendServiceException {
    public InvalidFriendRequestException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
