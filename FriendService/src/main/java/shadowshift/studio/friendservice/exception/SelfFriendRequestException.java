package shadowshift.studio.friendservice.exception;

import org.springframework.http.HttpStatus;

public class SelfFriendRequestException extends FriendServiceException {
    public SelfFriendRequestException() {
        super(HttpStatus.BAD_REQUEST, "Невозможно отправить заявку дружбы самому себе");
    }
}
