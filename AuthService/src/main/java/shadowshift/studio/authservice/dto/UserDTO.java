package shadowshift.studio.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import shadowshift.studio.authservice.entity.Role;
import shadowshift.studio.authservice.entity.BanType;

import java.time.LocalDateTime;

/**
 * DTO для пользователя.
 * Содержит информацию о пользователе, включая профиль, статистику
 * и поля для совместимости с фронтендом.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserDTO {
    
    /** Идентификатор пользователя. */
    private Long id;
    
    /** Имя пользователя. */
    private String username;
    
    /** Email. */
    private String email;
    
    /** Отображаемое имя. */
    private String displayName;
    
    /** Аватар. */
    private String avatar;
    
    /** Биография. */
    private String bio;
    
    /** Роль. */
    private Role role;
    
    /** Флаг активности. */
    private Boolean isEnabled;
    
    /** Дата создания. */
    private LocalDateTime createdAt;
    
    /** Дата последнего входа. */
    private LocalDateTime lastLogin;
    
    /** Дата регистрации (алиас для createdAt). */
    private LocalDateTime registrationDate;
    
    /** Дата последнего входа (алиас для lastLogin). */
    private LocalDateTime lastLoginDate;
    
    /** Количество прочитанных глав. */
    private Integer chaptersReadCount;
    
    /** Количество поставленных лайков. */
    private Integer likesGivenCount;
    
    /** Количество комментариев. */
    private Integer commentsCount;

    /** Текущий уровень пользователя (placeholder вычисляется на бэкенде или фронтенде). */
    private Integer level;

    /** Общий опыт (XP) пользователя (может быть null если не инициализирован). */
    private Integer xp;

    /** Тип бана. */
    private BanType banType;

    /** Дата истечения временного бана. */
    private LocalDateTime banExpiresAt;
    
    /** Признак привязки Telegram. */
    private Boolean telegramConnected;
    
    /** Флаг включённых Telegram-уведомлений. */
    private Boolean telegramNotificationsEnabled;
    
    /** Дата последней привязки Telegram. */
    private LocalDateTime telegramLinkedAt;
}
