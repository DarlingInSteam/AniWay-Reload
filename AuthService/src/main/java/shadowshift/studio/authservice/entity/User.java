package shadowshift.studio.authservice.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * Сущность пользователя.
 * Представляет пользователя системы с профилем, статистикой и реализацией UserDetails.
 *
 * @author ShadowShiftStudio
 * @version 1.0
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User implements UserDetails {
    
    /** Идентификатор пользователя. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    /** Имя пользователя (уникальное). */
    @Column(unique = true, nullable = false)
    private String username;
    
    /** Email (уникальный). */
    @Column(unique = true, nullable = false)
    private String email;
    
    /** Пароль. */
    @Column(nullable = false)
    private String password;
    
    /** Отображаемое имя. */
    @Column(name = "display_name")
    private String displayName;
    
    /** Аватар. */
    private String avatar;
    
    /** Биография. */
    @Column(name = "bio")
    private String bio;
    
    /** Роль пользователя. */
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private Role role = Role.USER;
    
    /** Флаг активности аккаунта. */
    @Column(name = "is_enabled")
    @Builder.Default
    private Boolean isEnabled = true;
    
    /** Флаг неистечения аккаунта. */
    @Column(name = "is_account_non_expired")
    @Builder.Default
    private Boolean isAccountNonExpired = true;
    
    /** Флаг незаблокированности аккаунта. */
    @Column(name = "is_account_non_locked")
    @Builder.Default
    private Boolean isAccountNonLocked = true;
    
    /** Флаг неистечения учетных данных. */
    @Column(name = "is_credentials_non_expired")
    @Builder.Default
    private Boolean isCredentialsNonExpired = true;
    
    /** Дата создания. */
    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    
    /** Дата обновления. */
    @Column(name = "updated_at")
    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    /** Дата последнего входа. */
    @Column(name = "last_login")
    private LocalDateTime lastLogin;
    
    /** Количество прочитанных глав. */
    @Column(name = "chapters_read_count")
    @Builder.Default
    private Integer chaptersReadCount = 0;
    
    /** Количество поставленных лайков. */
    @Column(name = "likes_given_count")
    @Builder.Default
    private Integer likesGivenCount = 0;
    
    /** Количество комментариев. */
    @Column(name = "comments_count")
    @Builder.Default
    private Integer commentsCount = 0;
    
    /**
     * Возвращает список прав доступа пользователя.
     *
     * @return коллекция прав доступа
     */
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
    
    /**
     * Возвращает пароль пользователя.
     *
     * @return пароль
     */
    @Override
    public String getPassword() {
        return password;
    }
    
    /**
     * Возвращает имя пользователя.
     *
     * @return имя пользователя
     */
    @Override
    public String getUsername() {
        return username;
    }
    
    /**
     * Проверяет, не истек ли срок действия аккаунта.
     *
     * @return true, если аккаунт не истек
     */
    @Override
    public boolean isAccountNonExpired() {
        return isAccountNonExpired;
    }
    
    /**
     * Проверяет, не заблокирован ли аккаунт.
     *
     * @return true, если аккаунт не заблокирован
     */
    @Override
    public boolean isAccountNonLocked() {
        return isAccountNonLocked;
    }
    
    /**
     * Проверяет, не истекли ли учетные данные.
     *
     * @return true, если учетные данные не истекли
     */
    @Override
    public boolean isCredentialsNonExpired() {
        return isCredentialsNonExpired;
    }
    
    /**
     * Проверяет, активен ли аккаунт.
     *
     * @return true, если аккаунт активен
     */
    @Override
    public boolean isEnabled() {
        return isEnabled;
    }
    
    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
