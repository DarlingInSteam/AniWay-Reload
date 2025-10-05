package shadowshift.studio.messageservice.exception;

import org.springframework.http.HttpStatus;

public class CategoryNotFoundException extends MessagingServiceException {

    public CategoryNotFoundException(Long categoryId) {
        super(HttpStatus.NOT_FOUND, "Категория не найдена: " + categoryId);
    }
}
