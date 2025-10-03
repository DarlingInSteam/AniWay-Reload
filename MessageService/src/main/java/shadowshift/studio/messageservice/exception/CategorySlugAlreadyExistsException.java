package shadowshift.studio.messageservice.exception;

import org.springframework.http.HttpStatus;

public class CategorySlugAlreadyExistsException extends MessagingServiceException {

    public CategorySlugAlreadyExistsException(String slug) {
        super(HttpStatus.CONFLICT, "Категория со слагом уже существует: " + slug);
    }
}
