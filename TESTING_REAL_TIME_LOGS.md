# Инструкция по тестированию real-time логов автопарсинга

## Предварительные требования

1. Docker запущен
2. Все сервисы собраны и запущены

## Шаги для тестирования

### 1. Пересборка и запуск MangaService

```bash
# Остановить все контейнеры
docker-compose down

# Пересобрать MangaService
docker-compose build manga-service

# Запустить все сервисы
docker-compose up -d

# Проверить логи MangaService
docker-compose logs -f manga-service
```

Ожидаемый результат: MangaService должен запуститься **БЕЗ ОШИБОК** циклической зависимости.

### 2. Запуск автопарсинга

Откройте админ-панель на фронтенде и:

1. Перейдите в раздел **"Manga Management"**
2. Найдите секцию **"Auto-Parsing"**
3. Введите параметры:
   - **Page**: `1`
   - **Limit**: `1` (для быстрого теста)
4. Нажмите **"Start Auto-Parsing"**

Альтернативно через curl/Postman:
```bash
curl -X POST "http://localhost:8081/api/parser/auto-parse?page=1&limit=1"
```

Ответ:
```json
{
  "taskId": "600fcefb-66da-4909-88a8-2f60b540a84e",
  "status": "pending",
  "message": "Получение списка манг из каталога..."
}
```

Сохраните `taskId`!

### 3. Проверка логов в реальном времени

#### На фронтенде

LogViewer должен автоматически обновляться каждые 2 секунды и показывать логи:

```
[2025-10-06T18:46:33] [INFO] Force mode: disabled
[2025-10-06T18:46:33] [INFO] Caching: enabled
[2025-10-06T18:46:33] [INFO] ===== PARSING =====
[2025-10-06T18:46:33] [INFO] Parser: mangalib.
[2025-10-06T18:46:33] [INFO] Parsing i-alone-level-up...
[2025-10-06T18:46:57] [INFO] Chapter 218141 downloading [1/9]
[2025-10-06T18:46:57] [INFO] [1/9] Chapter 1.0 - Название parsing...
[2025-10-06T18:46:58] [INFO] [1/9] Chapter 1.0 - Название completed (12 slides)
[2025-10-06T18:47:03] [INFO] [Heartbeat] Процесс активен, прошло 1с с последнего обновления
```

#### Через API

```bash
curl "http://localhost:8081/api/parser/auto-parse/status/600fcefb-66da-4909-88a8-2f60b540a84e"
```

Ответ:
```json
{
  "taskId": "600fcefb-66da-4909-88a8-2f60b540a84e",
  "status": "running",
  "progress": 50,
  "message": "Парсинг манги 1/1: i-alone-level-up",
  "totalSlugs": 1,
  "processedSlugs": 0,
  "importedSlugs": [],
  "skippedSlugs": [],
  "failedSlugs": [],
  "logs": [
    "[2025-10-06T18:46:33.422527] [INFO] Force mode: disabled",
    "[2025-10-06T18:46:33.422564] [INFO] Caching: enabled",
    "[2025-10-06T18:46:33.466512] [INFO] Parser: mangalib.",
    "[2025-10-06T18:46:33.467005] [INFO] Parsing i-alone-level-up...",
    "[2025-10-06T18:46:57.999887] [INFO] Chapter 218141 downloading [1/9]",
    "[2025-10-06T18:46:58.000202] [INFO] Chapter 218141 amended.",
    "[2025-10-06T18:47:03.045172] [INFO] [Heartbeat] Процесс активен..."
  ]
}
```

### 4. Проверка в логах MangaService

```bash
docker-compose logs -f manga-service | grep -E "(Связали|addLogToTask|parseTaskId)"
```

Ожидаемые логи:
```
AutoParsingService: Связали parseTaskId=7c4c5b0c-9f13-4da6-98fc-0f1c0effef6d с autoParsingTaskId=600fcefb-66da-4909-88a8-2f60b540a84e
AutoParsingService: Связали fullParsingTaskId=cfed1d57-4882-47b0-8df4-f1fa7ccb6613 с autoParsingTaskId=600fcefb-66da-4909-88a8-2f60b540a84e
MelonIntegrationService: Зарегистрирована связь fullParsingTaskId=cfed1d57... → autoParsingTaskId=600fcefb...
MelonIntegrationService: Связали buildTaskId=a1b2c3d4... с autoParsingTaskId=600fcefb...
ProgressController: Получен запрос для задачи parseTaskId=7c4c5b0c..., logs=[...]
AutoParsingService: Лог для parseTaskId=7c4c5b0c... перенаправлен в autoParsingTaskId=600fcefb...
AutoParsingService: Добавлен лог в задачу 600fcefb...
```

**Важно**: Не должно быть логов типа:
```
WARN AutoParsingService: Задача не найдена для taskId=..., лог проигнорирован
```

### 5. Проверка компонентов LogViewer

На фронтенде LogViewer должен:

1. ✅ Показывать логи в терминальном стиле (темный фон, моноширинный шрифт)
2. ✅ Цветовая кодировка:
   - `[ERROR]` - красный
   - `[WARN]` - желтый
   - `[INFO]` - зеленый
3. ✅ Автопрокрутка вниз при появлении новых логов
4. ✅ Обновление каждые 2 секунды
5. ✅ Высота 400px с вертикальным скроллом

### 6. Итоговая проверка

После завершения автопарсинга (статус `completed`):

```bash
curl "http://localhost:8081/api/parser/auto-parse/status/600fcefb-66da-4909-88a8-2f60b540a84e"
```

Ответ должен содержать:
```json
{
  "status": "completed",
  "message": "Автопарсинг завершен. Импортировано: 1, пропущено: 0, ошибок: 0",
  "logs": [
    "...все логи парсинга...",
    "...последние логи билдинга...",
    "...логи импорта..."
  ]
}
```

## Что делать если логи не появляются

### 1. Проверьте маппинг в логах

```bash
docker-compose logs manga-service | grep "Связали"
```

Должно быть минимум 3 строки связывания для каждой манги:
- parseTaskId → autoParsingTaskId
- fullParsingTaskId → autoParsingTaskId
- buildTaskId → autoParsingTaskId (через MelonIntegrationService)

### 2. Проверьте получение логов от MelonService

```bash
docker-compose logs manga-service | grep "Получен запрос для задачи"
```

Должны быть записи с `logs=[...]`

### 3. Проверьте, что логи НЕ игнорируются

```bash
docker-compose logs manga-service | grep "лог проигнорирован"
```

**НЕ должно быть** таких строк!

### 4. Проверьте MelonService

```bash
docker-compose logs melon-service | grep "Progress sent"
```

Должны быть записи с отправкой логов в MangaService.

## Частые проблемы

### Проблема: "Ожидание логов..." на фронтенде

**Причина**: Логи приходят с неизвестным taskId

**Решение**: Проверить, что все 4 taskId связаны через маппинг (см. выше)

### Проблема: Циклическая зависимость при старте

**Причина**: `@Lazy` не применен или отсутствует импорт

**Решение**: Убедиться, что в `MelonIntegrationService.java`:
```java
import org.springframework.context.annotation.Lazy;

@Autowired
@Lazy
private AutoParsingService autoParsingService;
```

### Проблема: Логи появляются, но не все

**Причина**: Ring buffer ограничен 1000 строками

**Решение**: Это нормально для больших парсингов. Увеличить лимит в `AutoParsingService.java`:
```java
if (task.logs.size() > 5000) {  // было 1000
    task.logs.remove(0);
}
```

## Успешный результат

✅ Логи появляются на фронтенде в реальном времени  
✅ Нет ошибок "Задача не найдена"  
✅ Heartbeat каждые 30 секунд  
✅ Логи от парсера (Chapter X parsing...)  
✅ Логи от билдера (downloading [X/Y])  
✅ Автопрокрутка работает  
✅ Цветовая кодировка применена  

🎉 **Поздравляем! Real-time логи работают!** 🎉
