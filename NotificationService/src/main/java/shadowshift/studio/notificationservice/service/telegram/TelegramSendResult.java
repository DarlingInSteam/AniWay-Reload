package shadowshift.studio.notificationservice.service.telegram;

public record TelegramSendResult(
        boolean success,
        String errorCode,
        String description,
        int retryAfterSeconds,
        boolean retryable
) {
    public static TelegramSendResult ok() {
        return new TelegramSendResult(true, null, null, 0, false);
    }

    public static TelegramSendResult failure(String errorCode, String description, int retryAfterSeconds, boolean retryable) {
        return new TelegramSendResult(false, errorCode, description, Math.max(retryAfterSeconds, 0), retryable);
    }
}
