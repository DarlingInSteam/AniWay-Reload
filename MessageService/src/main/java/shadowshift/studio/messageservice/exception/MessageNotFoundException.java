package shadowshift.studio.messageservice.exception;

import org.springframework.http.HttpStatus;

import java.util.UUID;

public class MessageNotFoundException extends MessagingServiceException {

    public MessageNotFoundException(UUID messageId) {
        super(HttpStatus.NOT_FOUND, "Сообщение не найдено: " + messageId);
    }
}
