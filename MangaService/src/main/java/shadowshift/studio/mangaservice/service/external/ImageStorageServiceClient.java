package shadowshift.studio.mangaservice.service.external;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;

/**
 * Клиент для взаимодействия с внешним ImageStorageService.
 * Предоставляет методы для получения изображений глав манги.
 *
 * @author ShadowShiftStudio
 */
@Service
public class ImageStorageServiceClient {

    private static final Logger logger = LoggerFactory.getLogger(ImageStorageServiceClient.class);

    private final WebClient.Builder webClientBuilder;
    private final String imageStorageServiceUrl;

    /**
     * Конструктор для инициализации клиента.
     *
     * @param webClientBuilder билдер для создания WebClient
     * @param imageStorageServiceUrl URL внешнего сервиса хранения изображений
     */
    @Autowired
    public ImageStorageServiceClient(WebClient.Builder webClientBuilder,
                                   @Value("${image.storage.service.url}") String imageStorageServiceUrl) {
        this.webClientBuilder = webClientBuilder;
        this.imageStorageServiceUrl = imageStorageServiceUrl;
        logger.info("Инициализирован ImageStorageServiceClient с URL: {}", imageStorageServiceUrl);
    }

    /**
     * Получает изображения главы (упрощенная версия).
     */
    public List<Object> getChapterImages(Long chapterId) {
        try {
            WebClient webClient = webClientBuilder.build();
            List<Object> images = webClient.get()
                    .uri(imageStorageServiceUrl + "/api/images/chapter/" + chapterId)
                    .retrieve()
                    .bodyToFlux(Object.class)
                    .collectList()
                    .block();
            return images != null ? images : new ArrayList<>();
        } catch (Exception e) {
            logger.warn("Ошибка получения изображений для главы {}: {}", chapterId, e.getMessage());
            return new ArrayList<>();
        }
    }
}
