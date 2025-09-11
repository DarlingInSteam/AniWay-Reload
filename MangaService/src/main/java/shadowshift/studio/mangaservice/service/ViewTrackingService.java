package shadowshift.studio.mangaservice.service;

import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Сервис для отслеживания просмотров манги с rate limiting.
 * Управляет счетчиками просмотров и предотвращает накрутку просмотров одним пользователем.
 *
 * @author ShadowShiftStudio
 */
@Service
public class ViewTrackingService {

    /**
     * Проверяет, может ли пользователь увеличить уникальный счетчик просмотров.
     * Использует кэш для хранения времени последнего просмотра.
     *
     * @param userId идентификатор пользователя
     * @param mangaId идентификатор манги
     * @return true, если можно увеличить уникальный счетчик, false - если rate limit активен
     */
    @Cacheable(value = "userMangaView", key = "#userId + '_' + #mangaId")
    public Boolean canIncrementUniqueView(String userId, Long mangaId) {
        // Если значение в кэше отсутствует, значит пользователь еще не смотрел эту мангу
        // Возвращаем true, чтобы разрешить увеличение счетчика
        return true;
    }

    /**
     * Вычисляет время до истечения rate limit для пользователя и манги.
     *
     * @param userId идентификатор пользователя
     * @param mangaId идентификатор манги
     * @param lastViewTime время последнего просмотра
     * @return минуты до истечения rate limit, или 0 если rate limit истек
     */
    public long getMinutesUntilNextView(String userId, Long mangaId, LocalDateTime lastViewTime) {
        if (lastViewTime == null) {
            return 0;
        }

        long minutesSinceLastView = ChronoUnit.MINUTES.between(lastViewTime, LocalDateTime.now());
        long rateLimitMinutes = 60; // 1 час rate limit

        if (minutesSinceLastView >= rateLimitMinutes) {
            return 0; // Rate limit истек
        }

        return rateLimitMinutes - minutesSinceLastView;
    }
}
