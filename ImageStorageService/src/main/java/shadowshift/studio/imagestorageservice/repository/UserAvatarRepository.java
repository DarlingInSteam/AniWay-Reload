package shadowshift.studio.imagestorageservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import shadowshift.studio.imagestorageservice.entity.UserAvatar;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface UserAvatarRepository extends JpaRepository<UserAvatar, Long> {
    Optional<UserAvatar> findByUserId(Long userId);

    // Проверка последней загрузки (используется для rate limit)
    default boolean isUploadAllowed(Optional<UserAvatar> existing, LocalDateTime now) {
        return existing.isEmpty() || existing.get().getUpdatedAt() == null ||
                existing.get().getUpdatedAt().isBefore(now.minusHours(24));
    }
}
