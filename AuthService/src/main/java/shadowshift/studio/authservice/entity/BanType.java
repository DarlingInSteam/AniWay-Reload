package shadowshift.studio.authservice.entity;

/**
 * Тип бана пользователя.
 * NONE      - отсутствует бан
 * PERM      - перманентный бан (аккаунт отключен)
 * TEMP      - временный бан до указанной даты
 * SHADOW    - теневой бан (пользователь не видит ограничений, но часть действий игнорируется на других сервисах)
 */
public enum BanType {
    NONE,
    PERM,
    TEMP,
    SHADOW
}
