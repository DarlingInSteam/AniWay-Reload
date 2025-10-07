# Реализация логов в реальном времени

## Обзор
Система позволяет видеть логи из MelonService на фронтенде в реальном времени во время автопарсинга и автообновления манги.

## Архитектура

```
MelonService (Python subprocess)
    ↓ stdout/stderr
run_melon_command() [читает параллельно]
    ↓ log_task_message()
task_logs storage
    ↓ update_task_status() [последние 10 логов]
HTTP POST /api/parser/progress/{taskId}
    ↓
ProgressController.updateProgress()
    ↓ addLogToTask()
AutoParsingService.AutoParseTask.logs (1000 строк max)
    ↓ GET /api/parser/auto-parse/status/{taskId}
Frontend LogViewer component
    ↓ Polling каждые 2 секунды
Отображение с автоскроллом
```

## Компоненты

### 1. Backend - MelonService (Python)

**Файл**: `MelonService/api_server.py`

#### Хранилище логов
```python
task_logs: Dict[str, List[LogEntry]] = {}

class LogEntry(BaseModel):
    timestamp: str
    level: str
    message: str
    task_id: Optional[str] = None
```

#### Функция логирования
```python
def log_task_message(task_id: str, level: str, message: str):
    """Добавляет сообщение в логи задачи"""
    if task_id not in task_logs:
        task_logs[task_id] = []
    
    log_entry = LogEntry(
        timestamp=datetime.now().isoformat(),
        level=level,
        message=message,
        task_id=task_id
    )
    
    task_logs[task_id].append(log_entry)
    
    # Ограничиваем количество логов (последние 1000)
    if len(task_logs[task_id]) > 1000:
        task_logs[task_id] = task_logs[task_id][-1000:]
```

#### Обновление статуса с логами
```python
def update_task_status(task_id: str, status: str, progress: int, message: str, result: Optional[Dict] = None, error: Optional[str] = None):
    """Обновляет статус задачи и отправляет логи в MangaService"""
    if task_id in tasks_storage:
        # ... обновление статуса ...
        
        # Собираем последние логи для отправки (последние 10 строк)
        logs_to_send = None
        if task_id in task_logs and len(task_logs[task_id]) > 0:
            recent_logs = task_logs[task_id][-10:]
            logs_to_send = [f"[{log.timestamp}] [{log.level}] {log.message}" for log in recent_logs]
        
        send_progress_to_manga_service(task_id, status, progress, message, error, logs_to_send)
```

#### Чтение вывода команды (ИСПРАВЛЕНО)
```python
async def run_melon_command(command: List[str], task_id: str, timeout: int = 600) -> Dict[str, Any]:
    """Запускает команду MelonService асинхронно с параллельным чтением stdout и stderr"""
    
    # Функция для чтения stdout
    async def read_stdout():
        if process.stdout:
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                line_str = line.decode('utf-8', errors='ignore').strip()
                if line_str:
                    stdout_lines.append(line_str)
                    log_task_message(task_id, "INFO", line_str)  # Логируем
                    # ... обновление прогресса ...

    # Функция для чтения stderr
    async def read_stderr():
        if process.stderr:
            while True:
                line = await process.stderr.readline()
                if not line:
                    break
                line_str = line.decode('utf-8', errors='ignore').strip()
                if line_str:
                    stderr_lines.append(line_str)
                    log_task_message(task_id, "ERROR", line_str)  # Логируем ошибки тоже!
    
    # Читаем stdout и stderr параллельно (избегаем deadlock)
    await asyncio.gather(read_stdout(), read_stderr())
```

**ВАЖНО**: Параллельное чтение stdout и stderr критично! Иначе процесс может зависнуть (deadlock), когда один буфер переполняется.

#### Отправка логов в MangaService
```python
def send_progress_to_manga_service(task_id, status, progress, message=None, error=None, logs=None):
    payload = {
        "status": status,
        "progress": progress,
        "message": message,
        "error": error
    }
    if logs:
        payload["logs"] = logs if isinstance(logs, list) else [logs]
    
    url = f"http://manga-service:8081/api/parser/progress/{taskId}"
    requests.post(url, json=payload, timeout=5)
```

### 2. Backend - MangaService (Java Spring Boot)

**Файл**: `MangaService/.../service/AutoParsingService.java`

#### AutoParseTask с логами
```java
private static class AutoParseTask {
    String taskId;
    String status;
    int progress;
    String message;
    int totalSlugs;
    int processedSlugs;
    List<String> skippedSlugs;
    List<String> importedSlugs;
    List<String> failedSlugs;
    Instant startTime;
    Instant endTime;
    List<String> logs;  // НОВОЕ: логи в реальном времени (1000 строк max)
}
```

#### Инициализация
```java
public String startAutoParsing(int page, Integer limit) {
    AutoParseTask task = new AutoParseTask();
    task.logs = new ArrayList<>();  // Инициализация
    // ...
}
```

#### Метод добавления логов
```java
public void addLogToTask(String taskId, String logMessage) {
    AutoParseTask task = autoParsingTasks.get(taskId);
    if (task != null) {
        synchronized (task.logs) {
            task.logs.add(logMessage);
            // Ограничиваем количество логов (последние 1000 строк)
            if (task.logs.size() > 1000) {
                task.logs.remove(0);  // Ring buffer
            }
        }
    }
}
```

#### Статус задачи с логами
```java
public Map<String, Object> getAutoParseTaskStatus(String taskId) {
    // ...
    result.put("logs", task.logs);  // НОВОЕ: возвращаем логи
    return result;
}
```

**Файл**: `MangaService/.../controller/ProgressController.java`

#### Прием логов от MelonService
```java
@RestController
@RequestMapping("/api/parser/progress")
public class ProgressController {
    
    @Autowired
    private AutoParsingService autoParsingService;  // НОВОЕ
    
    @PostMapping("/{taskId}")
    public ResponseEntity<?> updateProgress(@PathVariable String taskId, @RequestBody Map<String, Object> payload) {
        // ...существующий код обновления прогресса...
        
        // НОВОЕ: обработка логов
        @SuppressWarnings("unchecked")
        List<String> logs = (List<String>) payload.get("logs");
        
        if (logs != null && !logs.isEmpty()) {
            for (String log : logs) {
                autoParsingService.addLogToTask(taskId, log);
            }
        }
        
        return ResponseEntity.ok().build();
    }
}
```

### 3. Frontend - React/TypeScript

**Файл**: `AniWayFrontend/src/components/admin/MangaManagement.tsx`

#### Интерфейсы с логами
```typescript
interface AutoParseTask {
  task_id: string
  status: string
  progress: number
  message: string
  total_slugs: number
  processed_slugs: number
  skipped_slugs: string[]
  imported_slugs: string[]
  failed_slugs: string[]
  start_time: string
  end_time?: string
  logs?: string[]  // НОВОЕ
}

interface AutoUpdateTask {
  // ... аналогично ...
  logs?: string[]  // НОВОЕ
}
```

#### LogViewer компонент
```typescript
function LogViewer({ logs }: { logs?: string[] }) {
  const logContainerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  // Автоскролл при новых логах
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  // Отключение автоскролла при ручной прокрутке
  const handleScroll = () => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10
      setAutoScroll(isAtBottom)
    }
  }

  // Цветовое кодирование
  const getLogColor = (log: string) => {
    if (log.includes('[ERROR]')) return 'text-red-400'
    if (log.includes('[WARN]') || log.includes('[WARNING]')) return 'text-yellow-400'
    if (log.includes('[INFO]')) return 'text-green-400'
    if (log.includes('[DEBUG]')) return 'text-blue-400'
    return 'text-gray-300'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Логи выполнения</Label>
        <Badge variant={autoScroll ? "default" : "secondary"}>
          {autoScroll ? '🔄 Автоскролл' : '⏸️ Пауза'}
        </Badge>
      </div>
      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        className="bg-gray-950 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto"
        style={{ scrollBehavior: autoScroll ? 'smooth' : 'auto' }}
      >
        {logs.map((log, index) => (
          <div key={index} className={getLogColor(log)}>
            {log}
          </div>
        ))}
      </div>
    </div>
  )
}
```

#### Интеграция в UI
```typescript
{autoParseTask && (
  <div className="border rounded-lg p-4 space-y-3">
    {/* Статус, прогресс... */}
    
    {/* НОВОЕ: Логи */}
    <LogViewer logs={autoParseTask.logs} />
  </div>
)}
```

## Поток данных

1. **MelonService запускает subprocess** (`python main.py parse ...`)
2. **run_melon_command параллельно читает stdout и stderr**
   - Каждая строка → `log_task_message(task_id, level, message)`
   - Сохраняется в `task_logs[task_id]` (1000 строк max)
3. **update_task_status вызывается при каждом обновлении**
   - Берет последние 10 логов
   - Форматирует: `[timestamp] [level] message`
   - Отправляет в payload к MangaService
4. **ProgressController.updateProgress получает payload**
   - Извлекает `logs` из payload
   - Вызывает `autoParsingService.addLogToTask()` для каждого лога
5. **AutoParsingService.addLogToTask добавляет в task.logs**
   - Синхронизированное добавление (thread-safe)
   - Ring buffer: удаляет старые при превышении 1000 строк
6. **Frontend polling GET /status/{taskId}**
   - Каждые 2 секунды
   - Получает `logs` в ответе
   - Обновляет `autoParseTask.logs`
7. **LogViewer компонент рендерит логи**
   - Цветовое кодирование по уровню
   - Автоскролл к последней строке
   - Плавная прокрутка

## Исправленные проблемы

### 1. Deadlock при чтении stdout/stderr (КРИТИЧЕСКАЯ ОШИБКА!)
**Проблема**: Последовательное чтение stdout, затем stderr вызывало блокировку процесса
```python
# ПЛОХО - процесс зависает!
while True:
    line = await process.stdout.readline()  # Ждет, пока stdout не закроется
    # ...

while True:
    line = await process.stderr.readline()  # Никогда не достигается!
    # ...
```

**Решение**: Параллельное чтение с `asyncio.gather()`
```python
async def read_stdout(): ...
async def read_stderr(): ...

await asyncio.gather(read_stdout(), read_stderr())  # Параллельно!
```

### 2. Логи stderr не отправлялись
**Проблема**: Ошибки в stderr не попадали в `task_logs`
**Решение**: Добавлен `log_task_message(task_id, "ERROR", line_str)` в `read_stderr()`

### 3. Ring buffer для предотвращения переполнения памяти
**MelonService**: 1000 логов в `task_logs`
**MangaService**: 1000 логов в `AutoParseTask.logs`

## Стилизация UI

### Цветовая схема
- **ERROR**: `text-red-400` (красный)
- **WARN/WARNING**: `text-yellow-400` (желтый)
- **INFO**: `text-green-400` (зеленый)
- **DEBUG**: `text-blue-400` (синий)
- **По умолчанию**: `text-gray-300` (серый)

### Особенности
- Темный терминальный фон: `bg-gray-950`
- Моноширинный шрифт: `font-mono`
- Максимальная высота: `max-h-96` (384px)
- Автоскролл с индикатором статуса
- Hover эффект: `hover:bg-gray-900`
- Плавная прокрутка: `scroll-behavior: smooth`

## Тестирование

1. Запустить автопарсинг:
   ```
   POST /api/parser/auto-parse
   {
     "page": 1,
     "limit": 2
   }
   ```

2. Открыть UI и наблюдать логи в реальном времени:
   - Парсинг: зеленые INFO логи
   - Билдинг: INFO логи с прогрессом
   - Ошибки: красные ERROR логи

3. Проверить автоскролл:
   - Прокрутить вверх вручную → индикатор "⏸️ Пауза"
   - Прокрутить вниз → индикатор "🔄 Автоскролл"

## Производительность

- **Network**: Отправляем только последние 10 логов при каждом обновлении (каждые 2 сек)
- **Memory**: Ring buffer ограничивает количество логов (1000 строк)
- **UI**: React автоматически оптимизирует рендеринг списков с key

## Будущие улучшения

1. **WebSocket вместо polling** для мгновенной доставки логов
2. **Фильтрация по уровню** (только ERROR, только INFO и т.д.)
3. **Поиск по логам** (Ctrl+F в терминале)
4. **Скачивание логов** (экспорт в .txt или .log)
5. **Расширенная панель** с возможностью развернуть на весь экран
6. **Timestamps** в локальной timezone пользователя
7. **Подсветка синтаксиса** для JSON в логах
8. **Группировка логов** по задачам (парсинг, билдинг, импорт)

## Пример вывода

```
[2025-10-06T17:45:25.823Z] [INFO] Parsing i-alone-level-up...
[2025-10-06T17:46:12.456Z] [INFO] [1/200] Chapter 1.1 completed (15 slides)
[2025-10-06T17:46:45.789Z] [INFO] [2/200] Chapter 1.2 completed (20 slides)
[2025-10-06T17:47:23.012Z] [WARN] Skipping duplicate slide: page_005.jpg
[2025-10-06T18:15:56.345Z] [INFO] Building i-alone-level-up...
[2025-10-06T18:16:30.678Z] [INFO] Done in 35.2s
```

## Заключение

Система логов в реальном времени позволяет:
- Видеть прогресс парсинга по главам
- Обнаруживать ошибки немедленно
- Понимать, на каком этапе находится процесс
- Отлаживать проблемы без доступа к серверу

Критически важно использовать **параллельное чтение stdout/stderr** для избежания deadlock!
