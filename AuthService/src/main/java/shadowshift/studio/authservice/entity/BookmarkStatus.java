package shadowshift.studio.authservice.entity;

/**
 * Перечисление статусов закладки.
 * Определяет возможные статусы закладки пользователя на мангу.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
public enum BookmarkStatus {
    
    /** Читаю. */
    READING,
    
    /** Буду читать. */
    PLAN_TO_READ,
    
    /** Прочитано. */
    COMPLETED,
    
    /** Отложено. */
    ON_HOLD,
    
    /** Брошено. */
    DROPPED
}
