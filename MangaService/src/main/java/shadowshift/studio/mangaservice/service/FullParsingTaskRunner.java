package shadowshift.studio.mangaservice.service;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import java.util.concurrent.CompletableFuture;

/**
 * Сервис для асинхронного запуска задач полного парсинга манги.
 * Обеспечивает выполнение задач в фоновом режиме.
 *
 * @author ShadowShiftStudio
 */
@Service
public class FullParsingTaskRunner {

    /**
     * Запускает задачу полного парсинга манги асинхронно.
     *
     * @param melonIntegrationService сервис интеграции с Melon
     * @param fullTaskId идентификатор полной задачи
     * @param parseTaskId идентификатор задачи парсинга
     * @param slug slug манги
     * @return CompletableFuture, завершающийся после выполнения задачи
     */
    @Async
    public CompletableFuture<Void> startFullParsingTask(MelonIntegrationService melonIntegrationService, String fullTaskId, String parseTaskId, String slug) {
        melonIntegrationService.runFullParsingTaskLogic(fullTaskId, parseTaskId, slug);
        return CompletableFuture.completedFuture(null);
    }
}
