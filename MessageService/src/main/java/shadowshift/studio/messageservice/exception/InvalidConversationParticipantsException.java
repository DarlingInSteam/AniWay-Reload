package shadowshift.studio.messageservice.exception;

import org.springframework.http.HttpStatus;

public class InvalidConversationParticipantsException extends MessagingServiceException {

    public InvalidConversationParticipantsException(String message) {
        super(HttpStatus.BAD_REQUEST, message);
    }
}
