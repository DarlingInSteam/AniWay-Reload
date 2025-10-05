package shadowshift.studio.friendservice.exception;

import org.springframework.http.HttpStatus;

public class FriendRequestAlreadyProcessedException extends FriendServiceException {
    public FriendRequestAlreadyProcessedException() {
        super(HttpStatus.CONFLICT, "Заявка в друзья уже обработана");
    }
}
