package shadowshift.studio.commentservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO для информации о пользователе, получаемой из AuthService.
 * Содержит основные данные пользователя для отображения в комментариях.
 *
 * @author ShadowShiftStudio
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserInfoDTO {

    /** Уникальный идентификатор пользователя */
    private Long id;

    /** Имя пользователя для отображения */
    private String username;

    /** Email адрес пользователя */
    private String email;

    /** URL аватара пользователя */
    private String avatar;

    /** Роль пользователя в системе */
    private String role;
}
