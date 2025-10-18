package shadowshift.studio.parserservice.domain.task;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Контракт для работы с хранилищем задач. Реализация может быть in-memory или поверх БД.
 */
public interface TaskRepository {

    ParserTask save(ParserTask task);

    Optional<ParserTask> findById(UUID id);

    List<ParserTask> findAll();

    /**
     * Удаляет задачи со статусом COMPLETED/FAILED/CANCELLED и возвращает их идентификаторы.
     */
    List<UUID> removeFinished();
}
