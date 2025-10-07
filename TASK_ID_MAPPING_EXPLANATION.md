# Система связывания Task IDs для логов автопарсинга

## Проблема

При автопарсинге манги используется **4 разных Task ID**:

1. **autoParsingTaskId** - создается `AutoParsingService` для отслеживания всего процесса автопарсинга каталога
2. **fullParsingTaskId** - создается `MelonIntegrationService.startFullParsing()` для координации parse + build
3. **parseTaskId** - создается `MelonService` при запуске `/parse` (парсинг JSON)
4. **buildTaskId** - создается `MelonService` при запуске `/build` (скачивание изображений)

**Проблема**: Логи от MelonService отправляются с `parseTaskId` или `buildTaskId`, но фронтенд запрашивает статус `autoParsingTaskId`. Без связывания этих ID логи теряются.

## Решение

Реализован **двухуровневый маппинг**:

### 1. В AutoParsingService

```java
// Маппинг любого дочернего taskId → autoParsingTaskId
private final Map<String, String> parseTaskToAutoParseTask = new HashMap<>();
```

**Регистрирует связи**:
- `parseTaskId` → `autoParsingTaskId`
- `fullParsingTaskId` → `autoParsingTaskId`
- `buildTaskId` → `autoParsingTaskId` (через MelonIntegrationService)

**Метод `addLogToTask(taskId, log)`**:
1. Проверяет, есть ли маппинг для `taskId`
2. Если да, перенаправляет лог в родительский `autoParsingTaskId`
3. Логи накапливаются в `AutoParseTask.logs` (ring buffer 1000 строк)

### 2. В MelonIntegrationService

```java
// Маппинг fullParsingTaskId → autoParsingTaskId
private final Map<String, String> fullParsingToAutoParsingTask = new HashMap<>();
```

**Использование**:
1. `AutoParsingService` вызывает `melonService.registerAutoParsingLink(fullParsingTaskId, autoParsingTaskId)`
2. Когда в `runFullParsingTaskLogic()` создается `buildTaskId`, проверяется маппинг
3. Если найден `autoParsingTaskId`, вызывается `autoParsingService.linkAdditionalTaskId(buildTaskId, autoParsingTaskId)`

## Поток данных

```
MelonService (parseTaskId) ──┐
                              │
MelonService (buildTaskId) ──┼──> ProgressController
                              │    receives logs with taskId
                              │         ↓
                              │    addLogToTask(taskId, log)
                              │         ↓
                              │    parseTaskToAutoParseTask.get(taskId)
                              │         ↓
                              └──> finds autoParsingTaskId
                                        ↓
                                   AutoParseTask.logs.add(log)
                                        ↓
                                   Frontend polls /auto-parse/status/{autoParsingTaskId}
                                        ↓
                                   Receives logs! ✅
```

## Lifecycle маппинга

### Создание связей

**В AutoParsingService.processAutoParsingAsync():**

```java
// 1. Запускаем полный парсинг
Map<String, Object> parseResult = melonService.startFullParsing(slug);
String fullParsingTaskId = (String) parseResult.get("task_id");
String parseTaskId = (String) parseResult.get("parse_task_id");

// 2. Связываем parseTaskId
parseTaskToAutoParseTask.put(parseTaskId, taskId);

// 3. Связываем fullParsingTaskId
parseTaskToAutoParseTask.put(fullParsingTaskId, taskId);

// 4. Регистрируем в MelonIntegrationService для buildTaskId
melonService.registerAutoParsingLink(fullParsingTaskId, taskId);
```

**В MelonIntegrationService.runFullParsingTaskLogic():**

```java
// Когда создается buildTaskId
String buildTaskId = (String) buildResult.get("task_id");

// Проверяем маппинг
String autoParsingTaskId = fullParsingToAutoParsingTask.get(fullTaskId);
if (autoParsingTaskId != null) {
    // Связываем buildTaskId с autoParsingTaskId
    autoParsingService.linkAdditionalTaskId(buildTaskId, autoParsingTaskId);
}
```

### Очистка маппинга

**В AutoParsingService (finally блок):**

```java
finally {
    if (parseTaskId != null) {
        parseTaskToAutoParseTask.remove(parseTaskId);
    }
    if (fullParsingTaskId != null) {
        parseTaskToAutoParseTask.remove(fullParsingTaskId);
    }
}
```

**В MelonIntegrationService (finally блок):**

```java
finally {
    fullParsingToAutoParsingTask.remove(fullTaskId);
}
```

## API методы

### AutoParsingService

#### `addLogToTask(String taskId, String logMessage)`
Добавляет лог в задачу. Поддерживает любой связанный taskId (parseTaskId, buildTaskId, fullParsingTaskId, autoParsingTaskId).

#### `linkAdditionalTaskId(String childTaskId, String autoParsingTaskId)`
Связывает дополнительный taskId (например, buildTaskId) с задачей автопарсинга.

### MelonIntegrationService

#### `registerAutoParsingLink(String fullParsingTaskId, String autoParsingTaskId)`
Регистрирует связь для автоматического связывания buildTaskId при его создании.

## Пример логов

```
AutoParsingService: Связали parseTaskId=7c4c5b0c... с autoParsingTaskId=600fcefb...
AutoParsingService: Связали fullParsingTaskId=cfed1d57... с autoParsingTaskId=600fcefb...
MelonIntegrationService: Зарегистрирована связь fullParsingTaskId=cfed1d57... → autoParsingTaskId=600fcefb...
MelonIntegrationService: Связали buildTaskId=a1b2c3d4... с autoParsingTaskId=600fcefb...
ProgressController: Получен запрос для задачи parseTaskId=7c4c5b0c..., logs=[...]
AutoParsingService: Лог для parseTaskId=7c4c5b0c... перенаправлен в autoParsingTaskId=600fcefb...
AutoParsingService: Добавлен лог в задачу 600fcefb...: [INFO] Chapter 218141 parsing...
```

## Особенности

1. **Ring buffer**: Хранится максимум 1000 последних логов на задачу
2. **Thread-safe**: Синхронизация на `task.logs` при добавлении
3. **Автоочистка**: Маппинг очищается после завершения каждой манги
4. **Гибкость**: Поддерживает любое количество связанных taskId

## Тестирование

1. Запустить автопарсинг: `POST /api/parser/auto-parse?page=1&limit=1`
2. Получить `autoParsingTaskId` из ответа
3. Опрашивать статус: `GET /api/parser/auto-parse/status/{autoParsingTaskId}`
4. В поле `logs` должны появляться логи от парсера в реальном времени:
   - `[INFO] Force mode: disabled`
   - `[INFO] Parsing i-alone-level-up...`
   - `[INFO] [1/9] Chapter 1.0 - Название parsing...`
   - `[INFO] [1/9] Chapter 1.0 - Название completed (12 slides)`

## Файлы изменений

- `AutoParsingService.java` - основной маппинг и метод `addLogToTask`
- `MelonIntegrationService.java` - регистрация buildTaskId, использует `@Lazy` для разрыва циклической зависимости
- `ProgressController.java` - прием логов от MelonService
- `api_server.py` (MelonService) - отправка логов в MangaService
- `MangaManagement.tsx` - компонент LogViewer для отображения

## Решение циклической зависимости

**Проблема**: Spring обнаружил циклическую зависимость:
```
MelonIntegrationService → AutoParsingService → MelonIntegrationService
```

**Решение**: Добавлен `@Lazy` к инжекции `AutoParsingService` в `MelonIntegrationService`:

```java
@Autowired
@Lazy
private AutoParsingService autoParsingService;
```

Это разрывает цикл, создавая proxy-объект AutoParsingService, который инициализируется только при первом обращении.
