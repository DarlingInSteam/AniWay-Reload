# Удаление таймаутов для долгих операций парсинга

## 🎯 Проблема

Некоторые манги с большим количеством глав могут парситься **100+ минут**, но система имела жёсткие таймауты:
- `waitForTaskCompletion`: 10 минут (300 попыток × 2с)
- `waitForFullParsingCompletion`: 10 минут
- `waitForImportCompletion`: 10 минут

После 10 минут ожидания задача помечалась как FAILED с ошибкой "Превышено время ожидания", хотя парсинг продолжал работать.

## ✅ Решение: Бесконечное ожидание с логированием

### 1. MelonIntegrationService.waitForTaskCompletion

**Файл:** `MangaService/src/main/java/.../service/MelonIntegrationService.java`

**БЫЛО:**
```java
int maxAttempts = 300; // 10 минут максимум
int attempts = 0;

do {
    Thread.sleep(2000);
    status = getTaskStatus(taskId);
    attempts++;

    if (attempts >= maxAttempts) {  // ❌ ТАЙМАУТ!
        return Map.of("status", "failed", 
            "message", "Превышено время ожидания");
    }
} while (status != null && !"completed".equals(status.get("status")) 
                        && !"failed".equals(status.get("status")));
```

**СТАЛО:**
```java
int attempts = 0; // БЕЗ таймаута - некоторые манги парсятся 100+ минут

do {
    Thread.sleep(2000);
    status = getTaskStatus(taskId);
    attempts++;

    // Логируем каждые 30 проверок (1 минута)
    if (attempts % 30 == 0) {
        int minutes = attempts * 2 / 60;
        logger.info("Ожидание задачи {}: {}min, статус: {}", 
            taskId, minutes, status != null ? status.get("status") : "null");
    }
} while (status != null && !"completed".equals(status.get("status")) 
                        && !"failed".equals(status.get("status")));

logger.info("Задача {} завершена после {}s, статус: {}", 
    taskId, attempts * 2, status != null ? status.get("status") : "null");
```

**Изменения:**
- ✅ Удалена переменная `maxAttempts`
- ✅ Удалена проверка `if (attempts >= maxAttempts)`
- ✅ Добавлено логирование каждую минуту
- ✅ Добавлено финальное логирование с общим временем

### 2. AutoParsingService.waitForFullParsingCompletion

**Файл:** `MangaService/src/main/java/.../service/AutoParsingService.java`

**БЫЛО:**
```java
int maxAttempts = 300; // 10 минут максимум
int attempts = 0;

while (attempts < maxAttempts) {  // ❌ ОГРАНИЧЕНИЕ!
    Thread.sleep(2000);
    Map<String, Object> status = melonService.getFullParsingTaskStatus(taskId);
    
    if (status != null && "completed".equals(status.get("status"))) {
        return true;
    }
    // ...
    attempts++;
}

logger.error("Превышено время ожидания");  // ❌ ОШИБКА
return false;
```

**СТАЛО:**
```java
int attempts = 0;

while (true) {  // ✅ БЕСКОНЕЧНЫЙ ЦИКЛ
    Thread.sleep(2000);
    Map<String, Object> status = melonService.getFullParsingTaskStatus(taskId);
    
    if (status != null && "completed".equals(status.get("status"))) {
        logger.info("Полный парсинг завершен успешно после {} попыток ({}s)", 
            attempts, attempts * 2);
        return true;
    }
    
    if (status != null && "failed".equals(status.get("status"))) {
        logger.error("Полный парсинг завершился с ошибкой после {} попыток: {}", 
            attempts, status.get("message"));
        return false;
    }
    
    attempts++;
    
    // Логируем прогресс каждую минуту
    if (attempts % 30 == 0) {
        int minutes = attempts * 2 / 60;
        logger.info("Ожидание парсинга {}: {} минут, прогресс: {}%", 
            taskId, minutes, status != null ? status.get("progress") : "?");
    }
}
```

**Изменения:**
- ✅ `while (attempts < maxAttempts)` → `while (true)`
- ✅ Проверка статуса `completed/failed` вместо таймаута
- ✅ Детальное логирование с прогрессом
- ✅ Информация о затраченном времени при завершении

### 3. AutoParsingService.waitForImportCompletion

**Аналогичные изменения:**
```java
while (true) {  // ✅ БЕСКОНЕЧНЫЙ ЦИКЛ
    Thread.sleep(2000);
    Map<String, Object> status = melonService.getImportTaskStatus(taskId);
    
    if (status != null && "completed".equals(status.get("status"))) {
        logger.info("Импорт завершен успешно после {} попыток ({}s)", 
            attempts, attempts * 2);
        return true;
    }
    
    if (status != null && "failed".equals(status.get("status"))) {
        logger.error("Импорт завершился с ошибкой после {} попыток: {}", 
            attempts, status.get("message"));
        return false;
    }
    
    attempts++;
    
    if (attempts % 30 == 0) {
        int minutes = attempts * 2 / 60;
        logger.info("Ожидание импорта {}: {} минут, прогресс: {}%", 
            taskId, minutes, status != null ? status.get("progress") : "?");
    }
}
```

## 📊 Логирование прогресса

### Периодичность логов:
- **Каждые 30 проверок** = 1 минута (30 × 2 секунды)
- **Показывает:** elapsed time (минуты), текущий статус, прогресс %

### Пример логов для 100-минутного парсинга:

```
17:40:00 INFO  Запуск парсинга для slug: very-long-manga
17:40:00 INFO  Ожидание завершения задачи parse-123: 0min, статус: running
17:41:00 INFO  Ожидание завершения задачи parse-123: 1min, статус: running
17:42:00 INFO  Ожидание завершения задачи parse-123: 2min, статус: running
...
18:40:00 INFO  Ожидание завершения задачи parse-123: 60min, статус: running
19:20:00 INFO  Ожидание завершения задачи parse-123: 100min, статус: running
19:20:15 INFO  Задача parse-123 завершена после 6015s, статус: completed
19:20:15 INFO  Полный парсинг завершен успешно после 3008 попыток (6016s)
```

### Преимущества:
1. ✅ **Видимость прогресса** - понятно, что процесс идёт
2. ✅ **Нет спама** - логи раз в минуту, не каждые 2 секунды
3. ✅ **Точная статистика** - сколько времени занял парсинг
4. ✅ **Безопасность** - никогда не упадём по таймауту

## 🔄 Логика завершения

### Методы ждут ТОЛЬКО статусы:
- `completed` → успех, возврат `true`
- `failed` → ошибка, возврат `false`
- `running/pending` → продолжаем ждать

### Никаких таймаутов:
- ❌ Нет `maxAttempts`
- ❌ Нет `if (time > limit)`
- ✅ Только проверка статуса из MelonService

## ⚠️ Потенциальные риски и меры безопасности

### Риск: Бесконечный цикл если статус зависнет
**Защита:**
- MelonService всегда возвращает `completed` или `failed` после завершения команды
- Если процесс падает, статус остаётся в памяти как последний известный
- Можно добавить emergency timeout (например, 24 часа) при необходимости

### Риск: Потребление ресурсов
**Защита:**
- Проверка раз в 2 секунды (не нагружает систему)
- Асинхронное выполнение (`@Async`)
- Thread.sleep не блокирует другие операции

### Риск: Накопление тредов
**Защита:**
- Spring Thread Pool управляет количеством потоков
- Каждая задача освобождает ресурсы после завершения
- `@Async` гарантирует независимое выполнение

## 🧪 Тестирование

### Проверка с быстрой мангой (5 минут):
```bash
# Запуск автопарсинга
curl -X POST http://localhost:8080/api/parser/auto-parse \
  -H "Content-Type: application/json" \
  -d '{"page": 1, "limit": 1}'

# Проверка логов - должны быть обновления каждую минуту
docker logs aniway-reload-manga-service-1 -f | grep "Ожидание"
```

**Ожидаемые логи:**
```
Ожидание завершения задачи xxx: 1min, статус: running
Ожидание завершения задачи xxx: 2min, статус: running
Ожидание завершения задачи xxx: 3min, статус: running
Ожидание завершения задачи xxx: 4min, статус: running
Задача xxx завершена после 300s, статус: completed
```

### Проверка с долгой мангой (100+ минут):
```bash
# Выбрать мангу с 500+ главами
# Запустить парсинг
# Мониторить логи

# НЕ должно быть ошибок "Превышено время ожидания"!
docker logs aniway-reload-manga-service-1 -f | grep -E "(Превышено|Ожидание)"
```

## 📝 Изменённые файлы

1. ✅ `MelonIntegrationService.java` - убран таймаут из `waitForTaskCompletion`
2. ✅ `AutoParsingService.java` - убраны таймауты из `waitForFullParsingCompletion` и `waitForImportCompletion`

## 🚀 Применение изменений

```bash
# Пересобрать MangaService
docker compose -f docker-compose.dev.yml up -d --build manga-service

# Проверить логи
docker logs aniway-reload-manga-service-1 --tail=100
```

## 📈 Ожидаемый результат

**До исправления:**
```
ERROR - Превышено время ожидания завершения задачи (10 минут)
STATUS: failed ❌
```

**После исправления:**
```
INFO - Ожидание задачи parse-123: 15min, статус: running
INFO - Ожидание задачи parse-123: 45min, статус: running
INFO - Ожидание задачи parse-123: 95min, статус: running
INFO - Задача parse-123 завершена после 5700s, статус: completed
STATUS: completed ✅
```

## 🎯 Итог

- ✅ **Нет таймаутов** - манги любого размера парсятся до завершения
- ✅ **Видимость прогресса** - логи каждую минуту
- ✅ **Надёжность** - система не падает при долгих операциях
- ✅ **Безопасность** - завершение только по статусу completed/failed
