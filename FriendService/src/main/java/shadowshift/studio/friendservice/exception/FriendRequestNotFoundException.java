package shadowshift.studio.friendservice.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class FriendRequestNotFoundException extends FriendServiceException {
    public FriendRequestNotFoundException(UUID id) {
        super(HttpStatus.NOT_FOUND, "Заявка в друзья %s не найдена".formatted(id));
    }
}
