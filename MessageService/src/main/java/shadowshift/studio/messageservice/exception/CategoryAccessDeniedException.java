package shadowshift.studio.messageservice.exception;

import org.springframework.http.HttpStatus;

public class CategoryAccessDeniedException extends MessagingServiceException {

    public CategoryAccessDeniedException() {
        super(HttpStatus.FORBIDDEN, "Недостаточно прав для управления категориями");
    }
}
