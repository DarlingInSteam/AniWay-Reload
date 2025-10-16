package shadowshift.studio.parserservice.domain.task;

/**
 * Статус задачи парсинга. Соответствует значениям, ожидаемым MangaService.
 */
public enum TaskStatus {
    PENDING,
    RUNNING,
    IMPORTING_MANGA,
    IMPORTING_CHAPTERS,
    COMPLETED,
    FAILED,
    CANCELLED
}
