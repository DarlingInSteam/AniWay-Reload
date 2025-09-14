package shadowshift.studio.mangaservice.service.external;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import shadowshift.studio.mangaservice.dto.ChapterDTO;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Клиент для взаимодействия с внешним ChapterService.
 * Предоставляет методы для получения данных о главах манги.
 *
 * @author ShadowShiftStudio
 */
@Service
public class ChapterServiceClient {

    private static final Logger logger = LoggerFactory.getLogger(ChapterServiceClient.class);

    private final WebClient.Builder webClientBuilder;
    private final String chapterServiceUrl;

    /**
     * Конструктор для инициализации клиента.
     *
     * @param webClientBuilder билдер для создания WebClient
     * @param chapterServiceUrl URL внешнего сервиса глав
     */
    @Autowired
    public ChapterServiceClient(WebClient.Builder webClientBuilder,
                               @Value("${chapter.service.url}") String chapterServiceUrl) {
        this.webClientBuilder = webClientBuilder;
        this.chapterServiceUrl = chapterServiceUrl;
        logger.info("Инициализирован ChapterServiceClient с URL: {}", chapterServiceUrl);
    }

    /**
     * Получает количество глав для манги (упрощенная версия).
     */
    public Optional<Integer> getChapterCount(Long mangaId) {
        try {
            WebClient webClient = webClientBuilder.build();
            Integer count = webClient.get()
                    .uri(chapterServiceUrl + "/api/chapters/count/" + mangaId)
                    .retrieve()
                    .bodyToMono(Integer.class)
                    .block();
            return Optional.ofNullable(count);
        } catch (Exception e) {
            logger.warn("Ошибка получения количества глав для манги {}: {}", mangaId, e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Получает список глав для манги (упрощенная версия).
     * Главы возвращаются в порядке возрастания номера главы.
     */
    @Cacheable(value = "mangaChapters", key = "#mangaId")
    public List<ChapterDTO> getChaptersByMangaId(Long mangaId) {
        try {
            WebClient webClient = webClientBuilder.build();
            List<ChapterDTO> chapters = webClient.get()
                    .uri(chapterServiceUrl + "/api/chapters/manga/" + mangaId)
                    .retrieve()
                    .bodyToFlux(ChapterDTO.class)
                    .collectList()
                    .block();
            return chapters != null ? chapters : new ArrayList<>();
        } catch (Exception e) {
            logger.warn("Ошибка получения глав для манги {}: {}", mangaId, e.getMessage());
            return new ArrayList<>();
        }
    }
}
