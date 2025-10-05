package shadowshift.studio.messageservice.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class ConversationAccessDeniedException extends MessagingServiceException {

    public ConversationAccessDeniedException(UUID conversationId) {
        super(HttpStatus.FORBIDDEN, "Нет доступа к беседе: " + conversationId);
    }
}
