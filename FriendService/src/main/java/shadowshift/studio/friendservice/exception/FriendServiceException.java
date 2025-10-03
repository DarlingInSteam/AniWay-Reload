package shadowshift.studio.friendservice.exception;

import org.springframework.http.HttpStatus;

public abstract class FriendServiceException extends RuntimeException {

    private final HttpStatus status;

    protected FriendServiceException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
