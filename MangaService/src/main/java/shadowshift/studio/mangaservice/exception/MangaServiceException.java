package shadowshift.studio.mangaservice.exception;

/**
 * Базовое исключение для всех бизнес-логических ошибок в MangaService.
 *
 * Это абстрактное исключение служит основой для всех кастомных исключений
 * в приложении, обеспечивая единообразную обработку ошибок и следуя
 * принципу единственной ответственности.
 *
 * @author ShadowShiftStudio
 */
public abstract class MangaServiceException extends RuntimeException {

    private final String errorCode;

    /**
     * Конструктор с сообщением об ошибке.
     *
     * @param message описание ошибки
     * @param errorCode код ошибки для идентификации типа проблемы
     */
    protected MangaServiceException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
    }

    /**
     * Конструктор с сообщением об ошибке и причиной.
     *
     * @param message описание ошибки
     * @param errorCode код ошибки для идентификации типа проблемы
     * @param cause первопричина исключения
     */
    protected MangaServiceException(String message, String errorCode, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
    }

    /**
     * Получает код ошибки.
     *
     * @return код ошибки
     */
    public String getErrorCode() {
        return errorCode;
    }
}

/**
 * Исключение, выбрасываемое когда запрашиваемая манга не найдена.
 */
class MangaNotFoundException extends MangaServiceException {

    /**
     * Конструктор с ID манги.
     *
     * @param mangaId ID манги, которая не найдена
     */
    public MangaNotFoundException(Long mangaId) {
        super(String.format("Манга с ID %d не найдена", mangaId), "MANGA_NOT_FOUND");
    }
}

/**
 * Исключение, выбрасываемое при ошибках валидации данных манги.
 */
class MangaValidationException extends MangaServiceException {

    /**
     * Конструктор с сообщением об ошибке.
     *
     * @param message описание ошибки валидации
     */
    public MangaValidationException(String message) {
        super(message, "MANGA_VALIDATION_ERROR");
    }

    /**
     * Конструктор с сообщением об ошибке и причиной.
     *
     * @param message описание ошибки валидации
     * @param cause первопричина исключения
     */
    public MangaValidationException(String message, Throwable cause) {
        super(message, "MANGA_VALIDATION_ERROR", cause);
    }
}

/**
 * Исключение, выбрасываемое при недоступности внешних сервисов.
 */
class ExternalServiceException extends MangaServiceException {

    /**
     * Конструктор с именем сервиса и операцией.
     *
     * @param serviceName имя недоступного сервиса
     * @param operation выполняемая операция
     */
    public ExternalServiceException(String serviceName, String operation) {
        super(String.format("Сервис %s недоступен при выполнении операции: %s", serviceName, operation),
              "EXTERNAL_SERVICE_ERROR");
    }

    /**
     * Конструктор с именем сервиса, операцией и причиной.
     *
     * @param serviceName имя сервиса
     * @param operation выполняемая операция
     * @param cause первопричина исключения
     */
    public ExternalServiceException(String serviceName, String operation, Throwable cause) {
        super(String.format("Ошибка при обращении к сервису %s (операция: %s): %s",
              serviceName, operation, cause.getMessage()), "EXTERNAL_SERVICE_ERROR", cause);
    }
}
