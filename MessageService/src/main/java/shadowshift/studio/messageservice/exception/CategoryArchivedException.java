package shadowshift.studio.messageservice.exception;

import org.springframework.http.HttpStatus;

public class CategoryArchivedException extends MessagingServiceException {

    public CategoryArchivedException(Long categoryId) {
        super(HttpStatus.BAD_REQUEST, "Категория архивирована: " + categoryId);
    }
}
