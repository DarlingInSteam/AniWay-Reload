# Исправление таймаутов автопарсинга

## Проблема
Автопарсинг не выполнял BUILD и IMPORT, только PARSE (скачивание метаданных).

## Причина
1. **Spring @Async не работал** - вызов `processAutoParsingAsync` из того же класса (self-invocation)
2. **Таймауты слишком короткие** - парсинг занимает 2+ минуты, а ожидание было 2 минуты
3. **Gateway 504 timeout** - эндпоинт `/api/parser/progress/**` не был public

## Исправления

### 1. Spring @Async через ApplicationContext Proxy
**Файл:** `MangaService/src/main/java/.../service/AutoParsingService.java`

```java
// Добавлен импорт
import org.springframework.context.ApplicationContext;

// Добавлено поле
@Autowired
private ApplicationContext applicationContext;

// Изменен вызов асинхронного метода
// БЫЛО (self-invocation - не работает):
processAutoParsingAsync(taskId, task.page, limit);

// СТАЛО (через Spring proxy):
AutoParsingService proxy = applicationContext.getBean(AutoParsingService.class);
proxy.processAutoParsingAsync(taskId, task.page, limit);
```

**Почему это важно:**
- `@Async` работает только на вызовах через Spring proxy
- Self-invocation (вызов из того же бина) выполняется синхронно
- Это блокировало поток на 2+ минуты → 504 Gateway Timeout

### 2. Увеличение таймаутов ожидания

**Файл:** `MangaService/src/main/java/.../service/MelonIntegrationService.java`
```java
// БЫЛО:
int maxAttempts = 60; // 2 минуты

// СТАЛО:
int maxAttempts = 300; // 10 минут (парсинг может быть долгим)
```

**Файл:** `MangaService/src/main/java/.../service/AutoParsingService.java`
```java
// waitForFullParsingCompletion:
int maxAttempts = 300; // БЫЛО: 120 (4 минуты)

// waitForImportCompletion:
int maxAttempts = 300; // БЫЛО: 120 (4 минуты)
```

**Обоснование:**
- Парсинг 1 манги: ~2 минуты
- BUILD (скачивание картинок): ~3-5 минут
- IMPORT (загрузка в систему): ~2-3 минуты
- **Итого: до 10 минут на 1 мангу**

### 3. Gateway public paths (уже исправлено ранее)
**Файл:** `GateWayService/src/main/resources/application-docker.yml`
```yaml
public-paths: "...,/api/parser/progress/**,..."
```

## Процесс автопарсинга (как должен работать)

```
┌─────────────────────────────────────────────────────────┐
│ 1. POST /api/parser/auto-parse (page=1, limit=2)      │
│    ↓ Возвращает task_id СРАЗУ (без блокировки)        │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Асинхронная обработка (фон):                        │
│    ↓                                                     │
│    ├─ GET /catalog/1?limit=2                           │
│    │  → Получить список slugs: [slug1, slug2]          │
│    │                                                     │
│    ├─ Для каждого slug:                                │
│    │  ├─ Проверка дубликата (existsByMelonSlug)        │
│    │  │  └─ Если есть → skip                           │
│    │  │                                                 │
│    │  ├─ POST /parse (slug) → task_id_parse            │
│    │  │  └─ Ждать completion (до 10 мин)               │
│    │  │                                                 │
│    │  ├─ POST /build (slug) → task_id_build            │
│    │  │  └─ Ждать completion (до 10 мин)               │
│    │  │                                                 │
│    │  ├─ POST /import (slug) → task_id_import          │
│    │  │  └─ Ждать completion (до 10 мин)               │
│    │  │                                                 │
│    │  └─ DELETE /melon/{slug}                          │
│    │     └─ Очистка данных с Melon                     │
│    │                                                     │
│    └─ Статус: completed/failed                         │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Фронтенд поллинг:                                   │
│    GET /api/parser/auto-parse/status/{task_id}         │
│    Каждые 2 секунды → прогресс, импортированные и т.д. │
└─────────────────────────────────────────────────────────┘
```

## Логика каждого этапа

### PARSE (метаданные)
```bash
python main.py parse {slug} --use mangalib
```
- Скачивает JSON с информацией о манге
- Сохраняет в `Melon/mangalib/{slug}/info.json`
- **НЕ скачивает картинки**

### BUILD (сборка архива)
```bash
python main.py build {slug}
```
- Скачивает все изображения глав
- Создает архив `.aniway` с картинками
- Самый долгий этап (3-5 минут на мангу)

### IMPORT (в нашу систему)
- Создает Manga entity в БД
- Импортирует главы
- Загружает картинки в MinIO
- После успеха → удаляет из Melon

## Проверка работы

### 1. Запуск автопарсинга
```bash
curl -X POST http://localhost:8080/api/parser/auto-parse \
  -H "Content-Type: application/json" \
  -d '{"page": 1, "limit": 2}'

# Ответ должен прийти СРАЗУ (<5 сек):
{
  "task_id": "uuid",
  "status": "pending",
  "message": "Автопарсинг запущен"
}
```

### 2. Проверка статуса
```bash
curl http://localhost:8080/api/parser/auto-parse/status/{task_id}

# Ответ:
{
  "task_id": "uuid",
  "status": "running",
  "progress": 50,
  "total_slugs": 2,
  "processed_slugs": 1,
  "imported_slugs": ["slug1"],
  "skipped_slugs": [],
  "failed_slugs": [],
  "message": "Импорт манги 1/2: slug1"
}
```

### 3. Проверка логов MelonService
```bash
docker logs aniway-reload-melon-service-1 --tail=100
```

**Ожидаемые логи (правильная последовательность):**
```
Fetching catalog page 1 for mangalib, limit: 2
Successfully fetched 2 manga slugs
POST /parse HTTP/1.1 200 OK              # PARSE
Running command: python main.py parse slug1 --use mangalib
Parsing slug1...
POST /build HTTP/1.1 200 OK              # BUILD (!)
Running command: python main.py build slug1
Building slug1...
Chapter 1/50 downloaded...
Archive created: slug1.aniway
POST /import HTTP/1.1 200 OK             # IMPORT (!)
Importing slug1 to system...
DELETE /melon/slug1 HTTP/1.1 200 OK      # CLEANUP (!)
```

## Диагностика проблем

### Симптом: 504 Gateway Timeout
**Причина:** @Async не работает (self-invocation)
**Решение:** ✅ Вызов через ApplicationContext proxy

### Симптом: Только PARSE, нет BUILD
**Причина:** Таймаут `waitForTaskCompletion` истек (2 мин)
**Решение:** ✅ Увеличен до 10 минут

### Симптом: Progress updates 400 Bad Request
**Причина:** `/api/parser/progress/**` требует авторизацию
**Решение:** ✅ Добавлен в public-paths

### Симптом: Манга не появляется в БД
**Причина:** IMPORT не запускается или падает
**Проверка:**
```sql
SELECT * FROM manga WHERE melon_slug = 'slug1';
```

## Изменения в файлах

1. ✅ `AutoParsingService.java` - ApplicationContext + таймауты
2. ✅ `MelonIntegrationService.java` - таймауты ожидания
3. ✅ `application-docker.yml` - public paths

## Следующий шаг
Пересобрать и перезапустить `manga-service` и `gateway-service`:
```bash
docker compose -f docker-compose.dev.yml up -d --build manga-service gateway-service
```
