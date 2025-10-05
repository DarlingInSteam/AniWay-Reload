package shadowshift.studio.friendservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CreateFriendRequestPayload(
        @NotNull(message = "Не указан пользователь")
        @Positive(message = "Идентификатор пользователя должен быть положительным")
        Long targetUserId,

        @Size(max = 512, message = "Сообщение слишком длинное")
        String message
) {}
