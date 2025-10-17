package shadowshift.studio.parserservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import shadowshift.studio.parserservice.domain.task.ParserTask;
import shadowshift.studio.parserservice.domain.task.TaskStatus;

import java.time.Instant;

/**
 * Асинхронный исполнитель задач парсинга
 */
@Service
public class TaskExecutor {
    
    private static final Logger logger = LoggerFactory.getLogger(TaskExecutor.class);
    
    private final MangaLibParserService parserService;
    private final TaskService taskService;
    
    public TaskExecutor(MangaLibParserService parserService, TaskService taskService) {
        this.parserService = parserService;
        this.taskService = taskService;
    }
    
    /**
     * Асинхронно выполняет задачу парсинга
     */
    @Async
    public void executeParseTask(ParserTask task) {
        try {
            logger.info("🚀 Начинаем выполнение задачи парсинга: {}", task.getId());
            
            taskService.markRunning(task);
            taskService.appendLog(task, "Starting parse task");
            
            String slug = task.getSlugs().get(0);
            
            // Запускаем парсинг
            var result = parserService.parseManga(slug, "mangalib").join();
            
            if (result != null && result.getChapters() != null && !result.getChapters().isEmpty()) {
                taskService.markCompleted(task);
                taskService.appendLog(task, String.format("Parse completed: %d chapters", result.getChapters().size()));
                logger.info("✅ Задача парсинга завершена успешно: {} ({} глав)", 
                    task.getId(), result.getChapters().size());
            } else {
                task.setStatus(TaskStatus.FAILED);
                task.setCompletedAt(Instant.now());
                taskService.appendLog(task, "Parse failed: no chapters found");
                logger.error("❌ Задача парсинга провалена: {} (главы не найдены)", task.getId());
            }
            
        } catch (Exception e) {
            logger.error("❌ Ошибка выполнения задачи парсинга {}: {}", task.getId(), e.getMessage(), e);
            task.setStatus(TaskStatus.FAILED);
            task.setCompletedAt(Instant.now());
            taskService.appendLog(task, "Parse failed: " + e.getMessage());
        }
    }
    
    /**
     * Асинхронно выполняет задачу билда (скачивание изображений)
     */
    @Async
    public void executeBuildTask(ParserTask task) {
        try {
            logger.info("🚀 Начинаем выполнение задачи билда: {}", task.getId());
            
            taskService.markRunning(task);
            taskService.appendLog(task, "Starting build task");
            
            // TODO: Реализовать скачивание изображений
            taskService.appendLog(task, "Build not implemented yet");
            task.setStatus(TaskStatus.FAILED);
            task.setCompletedAt(Instant.now());
            
            logger.warn("⚠️ Build task not implemented: {}", task.getId());
            
        } catch (Exception e) {
            logger.error("❌ Ошибка выполнения задачи билда {}: {}", task.getId(), e.getMessage(), e);
            task.setStatus(TaskStatus.FAILED);
            task.setCompletedAt(Instant.now());
            taskService.appendLog(task, "Build failed: " + e.getMessage());
        }
    }
}
