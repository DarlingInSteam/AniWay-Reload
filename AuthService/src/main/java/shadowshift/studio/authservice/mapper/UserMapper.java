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
                .registrationDate(user.getCreatedAt())
                .lastLoginDate(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .lastLogin(user.getLastLogin())
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
}

