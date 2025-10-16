package shadowshift.studio.parserservice.service;

import org.springframework.stereotype.Service;
import shadowshift.studio.parserservice.dto.ParseTask;
import shadowshift.studio.parserservice.dto.BuildTask;
import shadowshift.studio.parserservice.dto.AutoParseTask;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Сервис для хранения и управления задачами парсинга/билда
 */
@Service
public class TaskStorageService {
    
    private final Map<String, ParseTask> parseTasks = new ConcurrentHashMap<>();
    private final Map<String, BuildTask> buildTasks = new ConcurrentHashMap<>();
    private final Map<String, AutoParseTask> autoParseTask = new ConcurrentHashMap<>();
    
    public ParseTask createParseTask(String taskId, String slug, String parser) {
        ParseTask task = new ParseTask(taskId, slug, parser);
        parseTasks.put(taskId, task);
        return task;
    }
    
    public ParseTask getParseTask(String taskId) {
        return parseTasks.get(taskId);
    }
    
    public BuildTask createBuildTask(String taskId, String slug, String parser) {
        BuildTask task = new BuildTask(taskId, slug, parser);
        buildTasks.put(taskId, task);
        return task;
    }
    
    public BuildTask getBuildTask(String taskId) {
        return buildTasks.get(taskId);
    }
    
    public AutoParseTask createAutoParseTask(String taskId, int page, Integer limit) {
        AutoParseTask task = new AutoParseTask(taskId, page, limit);
        autoParseTask.put(taskId, task);
        return task;
    }
    
    public AutoParseTask getAutoParseTask(String taskId) {
        return autoParseTask.get(taskId);
    }
    
    public void removeTask(String taskId) {
        parseTasks.remove(taskId);
        buildTasks.remove(taskId);
        autoParseTask.remove(taskId);
    }
}
