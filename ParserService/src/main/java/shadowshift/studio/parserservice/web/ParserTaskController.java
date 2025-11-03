package shadowshift.studio.parserservice.web;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import shadowshift.studio.parserservice.domain.task.ParserTask;
import shadowshift.studio.parserservice.domain.task.TaskLogEntry;
import shadowshift.studio.parserservice.domain.task.TaskStatus;
import shadowshift.studio.parserservice.service.TaskExecutor;
import shadowshift.studio.parserservice.service.TaskService;
import shadowshift.studio.parserservice.web.dto.BatchParseRequest;
import shadowshift.studio.parserservice.web.dto.BuildRequest;
import shadowshift.studio.parserservice.web.dto.ClearTasksResponse;
import shadowshift.studio.parserservice.web.dto.ParseRequest;
import shadowshift.studio.parserservice.web.dto.TaskCreatedResponse;
import shadowshift.studio.parserservice.web.dto.TaskLogDto;
import shadowshift.studio.parserservice.web.dto.TaskLogsResponse;
import shadowshift.studio.parserservice.web.dto.TaskResultDto;
import shadowshift.studio.parserservice.web.dto.TaskStatusResponse;
import shadowshift.studio.parserservice.web.dto.TaskSummaryResponse;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import shadowshift.studio.parserservice.util.ChapterKeyUtil;

@RestController
@Validated
@RequestMapping(produces = MediaType.APPLICATION_JSON_VALUE)
public class ParserTaskController {

    private static final String SUPPORTED_PARSER = "mangalib";

    private final TaskService taskService;
    private final TaskExecutor taskExecutor;

    public ParserTaskController(TaskService taskService, TaskExecutor taskExecutor) {
        this.taskService = taskService;
        this.taskExecutor = taskExecutor;
    }

    @PostMapping(path = "/parse", consumes = MediaType.APPLICATION_JSON_VALUE)
    public TaskCreatedResponse startParse(@Valid @RequestBody ParseRequest request) {
        ensureSupportedParser(request.getParser());
        String slug = normalizeSlug(request.getSlug());
        ParserTask task = taskService.createParseTask(slug);
        
        // Запускаем задачу асинхронно
        taskExecutor.executeParseTask(task);
        
        return new TaskCreatedResponse(task.getId(), task.getStatus().name());
    }

    @PostMapping(path = "/build", consumes = MediaType.APPLICATION_JSON_VALUE)
    public TaskCreatedResponse startBuild(@Valid @RequestBody BuildRequest request) {
        ensureSupportedParser(request.getParser());
        String slug = normalizeSlug(request.getSlug());
        if (!StringUtils.hasText(request.getType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "type is required");
        }
        ParserTask task = taskService.createBuildTask(slug);
        task.setBranchId(request.getBranchId());
        task.setAutoImport(request.isAutoImport());
        task.setBuildType(request.getType());

        var chapterIdSet = Optional.ofNullable(request.getChapterIds())
            .orElse(List.of())
            .stream()
            .filter(Objects::nonNull)
            .map(String::trim)
            .filter(value -> !value.isEmpty())
            .collect(Collectors.toCollection(LinkedHashSet::new));
        task.setTargetChapterIds(new ArrayList<>(chapterIdSet));

        var chapterKeySet = Optional.ofNullable(request.getChapterNumbers())
            .orElse(List.of())
            .stream()
            .map(entry -> ChapterKeyUtil.encode(entry.getVolume(), entry.getNumber()))
            .filter(Objects::nonNull)
            .collect(Collectors.toCollection(LinkedHashSet::new));
        task.setTargetChapterCompositeKeys(new ArrayList<>(chapterKeySet));

        if (!chapterIdSet.isEmpty() || !chapterKeySet.isEmpty()) {
            taskService.appendLog(task, "Partial build configured: ids=%d, numbers=%d".formatted(chapterIdSet.size(), chapterKeySet.size()));
        }

        task.setMessage("Build queued (%s)".formatted(request.getType()));
        
        // Запускаем задачу асинхронно
        taskExecutor.executeBuildTask(task);
        
        return new TaskCreatedResponse(task.getId(), task.getStatus().name());
    }

    @PostMapping(path = {"/batch-start", "/batch-parse"}, consumes = MediaType.APPLICATION_JSON_VALUE)
    public TaskCreatedResponse startBatch(@Valid @RequestBody BatchParseRequest request) {
        ensureSupportedParser(request.getParser());
        List<String> slugs = request.getSlugs().stream()
                .map(this::normalizeSlug)
                .toList();
        ParserTask task = taskService.createBatchTask(slugs);
        task.setMessage("Batch queued (%d slugs)".formatted(slugs.size()));
        return new TaskCreatedResponse(task.getId(), task.getStatus().name());
    }

    @GetMapping(path = "/tasks")
    public List<TaskSummaryResponse> listTasks() {
        return taskService.getTasks().stream()
                .sorted(Comparator.comparing(ParserTask::getCreatedAt).reversed())
                .map(this::mapToSummary)
                .toList();
    }

    @PostMapping(path = "/tasks/clear-completed")
    public ClearTasksResponse clearCompleted() {
        List<UUID> removed = taskService.clearFinishedTasks();
        return new ClearTasksResponse(removed.size(), removed);
    }

    @GetMapping(path = "/status/{taskId}")
    public TaskStatusResponse getStatus(@PathVariable UUID taskId) {
        ParserTask task = getTaskOrNotFound(taskId);
        return mapToStatus(task);
    }

    @GetMapping(path = "/logs/{taskId}")
    public TaskLogsResponse getLogs(@PathVariable UUID taskId,
                                    @RequestParam(name = "limit", defaultValue = "100") int limit) {
        ParserTask task = getTaskOrNotFound(taskId);
        List<TaskLogEntry> logs = task.getLogs();
        List<TaskLogDto> dtoList = logs.stream()
                .sorted(Comparator.comparingLong(TaskLogEntry::sequence))
                .skip(Math.max(0, logs.size() - Math.max(1, limit)))
                .map(this::mapLog)
                .toList();
        return new TaskLogsResponse(taskId, dtoList);
    }

    @GetMapping(path = "/logs/{taskId}/stream")
    public ResponseEntity<Void> streamLogs(@PathVariable UUID taskId) {
        // SSE будет реализовано на следующем этапе.
        if (taskService.getTask(taskId).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "task not found");
        }
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    @PostMapping(path = "/tasks/{taskId}/cancel")
    public ResponseEntity<Void> cancel(@PathVariable UUID taskId) {
        ParserTask task = getTaskOrNotFound(taskId);
        if (task.getStatus() == TaskStatus.COMPLETED || task.getStatus() == TaskStatus.FAILED || task.getStatus() == TaskStatus.CANCELLED) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        // Реализация отмены появится вместе с исполнительным движком.
        return ResponseEntity.status(HttpStatus.NOT_IMPLEMENTED).build();
    }

    private ParserTask getTaskOrNotFound(UUID id) {
        Optional<ParserTask> task = taskService.getTask(id);
        return task.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "task not found"));
    }

    private void ensureSupportedParser(String parser) {
        String value = parser == null ? SUPPORTED_PARSER : parser.trim().toLowerCase();
        if (!SUPPORTED_PARSER.equals(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported parser: " + parser);
        }
    }

    private String normalizeSlug(String slug) {
        if (!StringUtils.hasText(slug)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "slug is required");
        }
        return slug.trim();
    }

    private TaskSummaryResponse mapToSummary(ParserTask task) {
        String slug = task.getSlugs().isEmpty() ? null : task.getSlugs().getFirst();
        return new TaskSummaryResponse(
                task.getId(),
                task.getType().name(),
                task.getStatus().name(),
                task.getProgress(),
                task.getMessage(),
                slug,
                task.getCurrentSlug(),
                task.getTotalSlugs(),
                task.getCompletedSlugs(),
                task.getFailedSlugs(),
                task.getCreatedAt(),
                task.getUpdatedAt()
        );
    }

    private TaskStatusResponse mapToStatus(ParserTask task) {
        List<TaskResultDto> results = task.getResults().entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> {
                    var value = entry.getValue();
                    return new TaskResultDto(
                            entry.getKey(),
                            value.getStep(),
                            value.getStatus().name(),
                            value.getCompletedAt(),
                            value.getMetrics(),
                            value.getError(),
                            value.isImported()
                    );
                })
                .toList();

    List<TaskLogEntry> logEntries = task.getLogs();
    List<TaskLogDto> logs = logEntries.stream()
        .sorted(Comparator.comparingLong(TaskLogEntry::sequence))
        .skip(Math.max(0, logEntries.size() - 200))
        .map(this::mapLog)
        .toList();

    return new TaskStatusResponse(
                task.getId(),
                task.getType().name(),
                task.getStatus().name(),
                task.getProgress(),
                task.getMessage(),
                task.getSlugs(),
                task.getCurrentSlug(),
                task.getTotalSlugs(),
                task.getCompletedSlugs(),
                task.getFailedSlugs(),
                task.getCreatedAt(),
                task.getStartedAt(),
                task.getUpdatedAt(),
                task.getCompletedAt(),
                results,
                task.getMetrics(),
                logs,
                null
        );
    }

    private TaskLogDto mapLog(TaskLogEntry entry) {
        return new TaskLogDto(entry.sequence(), entry.timestamp(), entry.level(), entry.message());
    }
}
