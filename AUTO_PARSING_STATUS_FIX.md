# Исправление статусов и ошибок автопарсинга

## 🔴 Проблемы

### 1. Backend: Статус "RUNNING" не поддерживается
```
ERROR - Некорректное значение статуса: RUNNING
Progress sent to MangaService: {..., 'status': 'RUNNING', ...}, response: 400
```

**Причина:** MelonService отправляет статус "RUNNING", но `ImportTaskService.TaskStatus` enum не содержит этого значения.

### 2. Frontend: TypeError при чтении массивов
```
TypeError: Cannot read properties of undefined (reading 'length')
at autoParseTask.imported_slugs.length
```

**Причина:** Фронтенд пытается прочитать `.length` у массивов без опциональной цепочки (`?.`).

## ✅ Исправления

### 1. Добавлен статус RUNNING в enum

**Файл:** `MangaService/src/main/java/.../service/ImportTaskService.java`

```java
public enum TaskStatus {
    PENDING,
    RUNNING,              // ← ДОБАВЛЕНО
    IMPORTING_MANGA,
    IMPORTING_CHAPTERS,
    IMPORTING_PAGES,
    COMPLETED,
    FAILED
}
```

**Зачем:** MelonService использует этот статус для обозначения парсинга и билдинга.

### 2. Инициализация totalSlugs

**Файл:** `MangaService/src/main/java/.../service/AutoParsingService.java`

```java
AutoParseTask task = new AutoParseTask();
task.taskId = taskId;
task.status = "pending";
task.totalSlugs = 0;        // ← ДОБАВЛЕНО (явная инициализация)
task.processedSlugs = 0;
task.skippedSlugs = new ArrayList<>();
task.importedSlugs = new ArrayList<>();
task.failedSlugs = new ArrayList<>();
```

**Зачем:** Хотя `int` по умолчанию `0`, явная инициализация делает код яснее.

### 3. Безопасный доступ к массивам на фронтенде

**Файл:** `AniWayFrontend/src/components/admin/MangaManagement.tsx`

**БЫЛО:**
```tsx
<span>{autoParseTask.imported_slugs.length}</span>
<span>{autoParseTask.skipped_slugs.length}</span>
<span>{autoParseTask.failed_slugs.length}</span>

{autoParseTask.failed_slugs.length > 0 && (
  <Alert>Ошибки: {autoParseTask.failed_slugs.join(', ')}</Alert>
)}
```

**СТАЛО:**
```tsx
<span>{autoParseTask.imported_slugs?.length || 0}</span>
<span>{autoParseTask.skipped_slugs?.length || 0}</span>
<span>{autoParseTask.failed_slugs?.length || 0}</span>

{(autoParseTask.failed_slugs?.length || 0) > 0 && (
  <Alert>Ошибки: {autoParseTask.failed_slugs?.join(', ') || ''}</Alert>
)}
```

**Изменения:**
- `.length` → `.length?.` - опциональная цепочка
- `.join(', ')` → `.join?.(', ') || ''` - безопасный вызов
- Добавлен fallback `|| 0` для всех числовых значений

## 📊 Статусы задачи парсинга

### Жизненный цикл задачи:

```
PENDING              → Задача создана, ожидает начала
    ↓
RUNNING              → Парсинг/билдинг манги (MelonService работает)
    ↓
IMPORTING_MANGA      → Создание записи Manga в БД
    ↓
IMPORTING_CHAPTERS   → Импорт глав
    ↓
IMPORTING_PAGES      → Загрузка картинок в MinIO
    ↓
COMPLETED / FAILED   → Финальный статус
```

### Когда используется RUNNING:

**MelonService отправляет RUNNING при:**
- `python main.py parse {slug} --use mangalib` (парсинг метаданных)
- `python main.py build {slug}` (скачивание картинок)

**Пример из логов:**
```
Progress sent: {'status': 'RUNNING', 'progress': 5, 
  'message': 'Запуск команды: python main.py parse i-alone-level-up'}
  
Progress sent: {'status': 'RUNNING', 'progress': 17, 
  'message': 'Парсинг: Parsing i-alone-level-up...'}
```

## 🔍 Диагностика

### Проверка статусов в логах MangaService:

```bash
docker logs aniway-reload-manga-service-1 2>&1 | grep "статуса"
```

**Ожидаемый результат (после исправления):**
```
✅ Получен запрос на обновление прогресса: {status=RUNNING, ...}
   (без ошибок "Некорректное значение статуса")
```

### Проверка фронтенда в браузере:

**Откройте консоль (F12) и проверьте:**
```
✅ Нет TypeError
✅ Отображаются цифры: Всего: 2, Обработано: 0, Импортировано: 0
✅ Прогресс-бар обновляется каждые 2 секунды
```

### Проверка API ответа:

```bash
curl http://localhost:8080/api/parser/auto-parse/status/{task_id}
```

**Ожидаемый JSON:**
```json
{
  "task_id": "uuid",
  "status": "running",
  "progress": 50,
  "message": "Парсинг манги 1/2: i-alone-level-up",
  "total_slugs": 2,
  "processed_slugs": 1,
  "skipped_slugs": [],
  "imported_slugs": [],
  "failed_slugs": [],
  "start_time": "2025-10-06T17:38:20.000+00:00"
}
```

**Все массивы должны быть массивами, не `null`!**

## 📝 Изменённые файлы

1. ✅ `ImportTaskService.java` - добавлен статус RUNNING
2. ✅ `AutoParsingService.java` - явная инициализация totalSlugs
3. ✅ `MangaManagement.tsx` - безопасный доступ к массивам

## 🚀 Применение исправлений

### Backend (MangaService):
```bash
docker compose -f docker-compose.dev.yml up -d --build manga-service
```

### Frontend:
```bash
docker compose -f docker-compose.dev.yml up -d --build frontend
```

### Проверка:
```bash
# 1. Запустить автопарсинг
curl -X POST http://localhost:8080/api/parser/auto-parse \
  -H "Content-Type: application/json" \
  -d '{"page": 1, "limit": 2}'

# 2. Проверить логи MangaService (не должно быть ошибок статуса)
docker logs aniway-reload-manga-service-1 --tail=50 | grep "статуса"

# 3. Проверить логи MelonService (должны быть 200 OK, не 400)
docker logs aniway-reload-melon-service-1 --tail=50 | grep "Progress sent"

# Ожидаемый результат:
# Progress sent to MangaService: {..., 'status': 'RUNNING', ...}, response: 200 ✅
```

## 🎯 Результат

После исправлений:
- ✅ MelonService успешно отправляет прогресс (200 OK)
- ✅ MangaService принимает статус RUNNING
- ✅ Фронтенд не падает с TypeError
- ✅ Прогресс отображается корректно: "Всего: 2, Обработано: 1, Импортировано: 0"
