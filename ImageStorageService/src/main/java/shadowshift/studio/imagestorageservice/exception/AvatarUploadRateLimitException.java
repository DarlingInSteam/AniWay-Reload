package shadowshift.studio.imagestorageservice.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.TOO_MANY_REQUESTS)
public class AvatarUploadRateLimitException extends RuntimeException {
    public AvatarUploadRateLimitException(String message) { super(message); }
}
