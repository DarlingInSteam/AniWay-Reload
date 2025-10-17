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
    private final MangaBuildService buildService;
    
    public TaskExecutor(MangaLibParserService parserService, TaskService taskService, MangaBuildService buildService) {
        this.parserService = parserService;
        this.taskService = taskService;
        this.buildService = buildService;
    }
    
    /**
     * Асинхронно выполняет задачу парсинга
     */
    @Async
    public void executeParseTask(ParserTask task) {
        long startTime = System.currentTimeMillis();
        String slug = task.getSlugs().get(0);
        
        try {
            logger.info("🚀 [TASK START] TaskId: {}, Slug: {}, Type: PARSE", task.getId(), slug);
            
            taskService.markRunning(task);
            taskService.appendLog(task, "Starting parse task");
            
            // Запускаем парсинг
            var result = parserService.parseManga(slug, "mangalib").join();
            
            long totalTime = System.currentTimeMillis() - startTime;
            
            if (result != null && result.getChapters() != null && !result.getChapters().isEmpty()) {
                taskService.markCompleted(task);
                taskService.appendLog(task, String.format("Parse completed: %d chapters in %dms", 
                    result.getChapters().size(), totalTime));
                
                logger.info("✅ [TASK COMPLETE] TaskId: {}, Slug: {}, Chapters: {}, Time: {}ms, Avg: {}ms/chapter", 
                    task.getId(), slug, result.getChapters().size(), totalTime, 
                    totalTime / result.getChapters().size());
                    
            } else {
                task.setStatus(TaskStatus.FAILED);
                task.setCompletedAt(Instant.now());
                taskService.appendLog(task, String.format("Parse failed: no chapters found (time: %dms)", totalTime));
                
                logger.error("❌ [TASK FAILED] TaskId: {}, Slug: {}, Reason: No chapters, Time: {}ms", 
                    task.getId(), slug, totalTime);
            }
            
        } catch (Exception e) {
            long totalTime = System.currentTimeMillis() - startTime;
            logger.error("❌ [TASK ERROR] TaskId: {}, Slug: {}, Time: {}ms, Error: {}", 
                task.getId(), slug, totalTime, e.getMessage(), e);
            
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
        long startTime = System.currentTimeMillis();
        String slug = task.getSlugs().get(0);
        
        try {
            logger.info("🚀 [BUILD START] TaskId: {}, Slug: {}, Type: BUILD", task.getId(), slug);
            
            taskService.markRunning(task);
            taskService.appendLog(task, "Starting build task");
            
            // Execute the build using MangaBuildService
            buildService.buildManga(task);
            
            long totalTime = System.currentTimeMillis() - startTime;
            
            if (task.getStatus() == TaskStatus.COMPLETED) {
                logger.info("✅ [BUILD COMPLETE] TaskId: {}, Slug: {}, Time: {}ms", 
                    task.getId(), slug, totalTime);
            } else {
                logger.error("❌ [BUILD FAILED] TaskId: {}, Slug: {}, Time: {}ms", 
                    task.getId(), slug, totalTime);
            }
            
        } catch (Exception e) {
            long totalTime = System.currentTimeMillis() - startTime;
            logger.error("❌ [BUILD ERROR] TaskId: {}, Slug: {}, Time: {}ms, Error: {}", 
                task.getId(), slug, totalTime, e.getMessage(), e);
            
            task.setStatus(TaskStatus.FAILED);
            task.setCompletedAt(Instant.now());
            taskService.appendLog(task, "Build failed: " + e.getMessage());
        }
    }
}
