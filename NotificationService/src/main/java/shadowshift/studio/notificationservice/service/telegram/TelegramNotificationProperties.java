package shadowshift.studio.notificationservice.service.telegram;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "telegram.notifications")
public class TelegramNotificationProperties {

    /** Глобальный переключатель Telegram-уведомлений. */
    private boolean enabled = true;

    /** Окно агрегации в секундах (0 или меньше — мгновенная отправка). */
    private int aggregateWindowSeconds = 0;

    /** Максимальное количество попыток отправки сообщения. */
    private int maxRetries = 3;

    /** Базовая задержка между повторными попытками в миллисекундах. */
    private long retryBackoffMillis = 1000;

    /** Шаблон ссылки на главу. */
    private String chapterLinkTemplate = "https://aniway.space/manga/{mangaId}/chapter/{chapterId}";

    /** URL сайта для fallback ссылок. */
    private String siteBaseUrl = "https://aniway.space";

    /** Эмодзи перед названием тайтла (визуальный маркер). */
    private String titleEmoji = "\uD83D\uDCD6";

    /** Промо-строка, подчеркивающая преимущества. */
    private String promoLine = "Всегда бесплатно и быстрее всех \uD83D\uDE80";

    /** Строка-призыв поделиться сервисом. */
    private String shareLine = "Расскажи о нас друзьям \uD83D\uDC49";

    /** Значение UTM-параметра utm_source. */
    private String utmSource = "telegram";

    /** Значение UTM-параметра utm_medium. */
    private String utmMedium = "messenger";

    /** Значение UTM-параметра utm_campaign. */
    private String utmCampaign = "bookmark_new_chapter";
}
