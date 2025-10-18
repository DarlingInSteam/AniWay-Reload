package shadowshift.studio.parserservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import shadowshift.studio.parserservice.domain.task.ParserTask;
import shadowshift.studio.parserservice.domain.task.TaskLogEntry;
import shadowshift.studio.parserservice.domain.task.TaskRepository;
import shadowshift.studio.parserservice.domain.task.TaskStatus;
import shadowshift.studio.parserservice.domain.task.TaskType;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class TaskService {

    private static final Logger logger = LoggerFactory.getLogger(TaskService.class);

    private final TaskRepository repository;
    private final AtomicLong logSequence = new AtomicLong();

    public TaskService(TaskRepository repository) {
        this.repository = repository;
    }

    public ParserTask createParseTask(String slug) {
        ParserTask task = new ParserTask(UUID.randomUUID(), TaskType.PARSE, List.of(slug));
        repository.save(task);
        appendLog(task, "Task created for slug %s".formatted(slug));
        return task;
    }

    public ParserTask createBuildTask(String slug) {
        ParserTask task = new ParserTask(UUID.randomUUID(), TaskType.BUILD, List.of(slug));
        repository.save(task);
        appendLog(task, "Build task created for slug %s".formatted(slug));
        return task;
    }

    public ParserTask createBatchTask(List<String> slugs) {
        ParserTask task = new ParserTask(UUID.randomUUID(), TaskType.BATCH_PARSE, slugs);
        task.setMessage("Batch task queued (%d slugs)".formatted(slugs.size()));
        repository.save(task);
        appendLog(task, "Batch task created");
        return task;
    }

    public List<ParserTask> getTasks() {
        return repository.findAll();
    }

    public Optional<ParserTask> getTask(UUID id) {
        return repository.findById(id);
    }

    public List<UUID> clearFinishedTasks() {
        List<UUID> removed = repository.removeFinished();
        if (!removed.isEmpty()) {
            logger.info("Removed {} finished tasks", removed.size());
        }
        return removed;
    }

    public TaskLogEntry appendLog(ParserTask task, String message) {
        TaskLogEntry entry = new TaskLogEntry(logSequence.incrementAndGet(), Instant.now(), "INFO", message);
        task.appendLog(entry);
        return entry;
    }

    public void markRunning(ParserTask task) {
        task.setStatus(TaskStatus.RUNNING);
        task.setStartedAt(Instant.now());
    }

    public void markCompleted(ParserTask task) {
        task.setStatus(TaskStatus.COMPLETED);
        task.setProgress(100);
        task.setCompletedAt(Instant.now());
    }

    public void markFailed(ParserTask task, String error) {
        task.setStatus(TaskStatus.FAILED);
        task.setMessage(error);
        task.setCompletedAt(Instant.now());
        appendLog(task, "Task failed: %s".formatted(error));
    }
}
