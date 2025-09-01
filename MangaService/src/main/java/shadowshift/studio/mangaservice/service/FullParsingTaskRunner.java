package shadowshift.studio.mangaservice.service;

import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import java.util.concurrent.CompletableFuture;

@Service
public class FullParsingTaskRunner {
    @Async
    public CompletableFuture<Void> startFullParsingTask(MelonIntegrationService melonIntegrationService, String fullTaskId, String parseTaskId, String slug) {
        melonIntegrationService.runFullParsingTaskLogic(fullTaskId, parseTaskId, slug);
        return CompletableFuture.completedFuture(null);
    }
}
