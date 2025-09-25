package shadowshift.studio.authservice.mapper;

import shadowshift.studio.authservice.dto.UserDTO;
import shadowshift.studio.authservice.entity.User;

import java.util.ArrayList;
import java.util.List;

public class UserMapper {

    private UserMapper() {}

    /**
     * Преобразует сущность User в DTO UserDTO.
     * @param user
     * @return
     */
    public static UserDTO toUserDTO(User user) {
        if (user == null) return null;

        return UserDTO.builder()
                .id(user.getId())
                .username(user.getDisplayName() != null ? user.getDisplayName() : user.getUsername())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .avatar(user.getAvatar())
                .bio(user.getBio())
                .role(user.getRole())
        .banType(user.getBanType())
        .banExpiresAt(user.getBanExpiresAt())
                .registrationDate(user.getCreatedAt())
                .lastLoginDate(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .lastLogin(user.getLastLogin())
        // Добавляем публично отображаемые счетчики активности
        .chaptersReadCount(user.getChaptersReadCount())
        .likesGivenCount(user.getLikesGivenCount())
        .commentsCount(user.getCommentsCount())
    // Временная логика уровня/XP (упрощённо): 50 глав = +1 уровень, XP = прочитанные главы * 10
    .level(calculateLevel(user.getChaptersReadCount()))
    .xp(user.getChaptersReadCount() != null ? user.getChaptersReadCount() * 10 : 0)
                .build();
    }

    public static UserDTO toFullUserDTO(User user) {
        if (user == null) return null;

        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .avatar(user.getAvatar())
                .bio(user.getBio())
                .role(user.getRole())
                .isEnabled(user.getIsEnabled())
                .createdAt(user.getCreatedAt())
                .lastLogin(user.getLastLogin())
                .chaptersReadCount(user.getChaptersReadCount())
                .likesGivenCount(user.getLikesGivenCount())
                .commentsCount(user.getCommentsCount())
        .banType(user.getBanType())
        .banExpiresAt(user.getBanExpiresAt())
    .level(calculateLevel(user.getChaptersReadCount()))
    .xp(user.getChaptersReadCount() != null ? user.getChaptersReadCount() * 10 : 0)
                .build();
    }

    /**
     * Преобразует список сущностей User в список DTO UserDTO.
     * @param users
     * @return
     */
    public static List<UserDTO> toUserListDTO(List<User> users) {
        List<UserDTO> userDTOS = new ArrayList<>();

        for (User user : users) {
            userDTOS.add(toUserDTO(user));
        }

        return userDTOS;
    }
        private static Integer calculateLevel(Integer chapters) {
            if (chapters == null) return 1;
            return Math.max(1, Math.min(100, (chapters / 50) + 1));
        }
}

