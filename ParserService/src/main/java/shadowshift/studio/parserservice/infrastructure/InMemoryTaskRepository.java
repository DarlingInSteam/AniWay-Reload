package shadowshift.studio.parserservice.infrastructure;

import org.springframework.stereotype.Repository;
import shadowshift.studio.parserservice.domain.task.ParserTask;
import shadowshift.studio.parserservice.domain.task.TaskRepository;
import shadowshift.studio.parserservice.domain.task.TaskStatus;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Repository
public class InMemoryTaskRepository implements TaskRepository {

    private final ConcurrentMap<UUID, ParserTask> storage = new ConcurrentHashMap<>();

    @Override
    public ParserTask save(ParserTask task) {
        storage.put(task.getId(), task);
        return task;
    }

    @Override
    public Optional<ParserTask> findById(UUID id) {
        return Optional.ofNullable(storage.get(id));
    }

    @Override
    public List<ParserTask> findAll() {
        return new ArrayList<>(storage.values());
    }

    @Override
    public List<UUID> removeFinished() {
        Collection<UUID> keys = storage.keySet();
        List<UUID> removed = new ArrayList<>();
        for (UUID key : new ArrayList<>(keys)) {
            ParserTask task = storage.get(key);
            if (task == null) {
                continue;
            }
            TaskStatus status = task.getStatus();
            if (status == TaskStatus.COMPLETED || status == TaskStatus.FAILED || status == TaskStatus.CANCELLED) {
                storage.remove(key);
                removed.add(key);
            }
        }
        return removed;
    }
}
