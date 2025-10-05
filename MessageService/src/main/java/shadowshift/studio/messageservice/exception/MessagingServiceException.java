package shadowshift.studio.messageservice.exception;

import org.springframework.http.HttpStatus;

public abstract class MessagingServiceException extends RuntimeException {

    private final HttpStatus status;

    protected MessagingServiceException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
