package shadowshift.studio.messageservice.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class ConversationNotFoundException extends MessagingServiceException {

    public ConversationNotFoundException(UUID conversationId) {
        super(HttpStatus.NOT_FOUND, "Беседа не найдена: " + conversationId);
    }
}
