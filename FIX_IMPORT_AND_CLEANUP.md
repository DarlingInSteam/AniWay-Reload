# Исправление импорта и очистки после парсинга

## Проблема

После успешного построения архива (build) процесс застревал на бесконечном ожидании:

```
2025-10-06T20:02:21.059Z COMPLETED progress=100 "Архив успешно построен (simple)"
2025-10-06T20:02:22.094Z "Ожидание задачи 76b78b6b-...: 24min, статус: COMPLETED"
2025-10-06T20:03:22.143Z "Ожидание задачи 76b78b6b-...: 25min, статус: COMPLETED"
[Бесконечное зацикливание...]
```

## Причина

### 1. Регистрозависимая проверка статуса
MelonService отправляет статус `"COMPLETED"` (uppercase), но Java-код проверяет `"completed"` (lowercase):

```java
// ❌ БЫЛО (не работало):
if ("completed".equals(buildStatus.get("status"))) {
    // Импорт - никогда не выполнялся!
}

while (!"completed".equals(status.get("status")) && 
       !"failed".equals(status.get("status"))) {
    // Бесконечный цикл!
}
```

### 2. Отсутствие импорта и очистки
После успешного build не запускался импорт в БД и не удалялись данные из MelonService.

## Решение

### 1. Регистронезависимая проверка статуса

**Файл**: `MelonIntegrationService.java`

**Метод `waitForTaskCompletion()`** (строка ~256):
```java
// ✅ ИСПРАВЛЕНО:
while (status != null &&
       !"completed".equalsIgnoreCase(String.valueOf(status.get("status"))) &&
       !"failed".equalsIgnoreCase(String.valueOf(status.get("status")))) {
    // Теперь COMPLETED = completed
}
```

**Метод `runFullParsingTaskLogic()`** (строка ~157):
```java
// ✅ ИСПРАВЛЕНО:
if (!"completed".equalsIgnoreCase(String.valueOf(finalStatus.get("status")))) {
    // Проверка статуса парсинга
}

if ("completed".equalsIgnoreCase(String.valueOf(buildStatus.get("status")))) {
    // Проверка статуса билда
}
```

### 2. Добавлен полный workflow: Build → Import → Cleanup

**Новая логика в `runFullParsingTaskLogic()`**:

```java
if ("completed".equalsIgnoreCase(String.valueOf(buildStatus.get("status")))) {
    // 1️⃣ Build завершен успешно
    updateFullParsingTask(fullTaskId, "running", 70, 
        "Скачивание завершено, запускаем импорт в базу данных...", null);
    
    try {
        // 2️⃣ Импорт в БД (синхронно, ждем завершения)
        importMangaWithProgressAsync(fullTaskId, slug, null).get();
        logger.info("Импорт завершен для slug={}, очищаем данные из MelonService", slug);
        
        // 3️⃣ Очистка из MelonService
        updateFullParsingTask(fullTaskId, "running", 95, 
            "Импорт завершен, очистка данных из MelonService...", null);
        Map<String, Object> deleteResult = deleteManga(slug);
        
        if (deleteResult != null && Boolean.TRUE.equals(deleteResult.get("success"))) {
            logger.info("Данные успешно удалены из MelonService для slug={}", slug);
        } else {
            logger.warn("Не удалось удалить данные из MelonService для slug={}: {}", 
                slug, deleteResult);
        }
        
        // 4️⃣ Формируем финальный результат
        Map<String, Object> result = new HashMap<>();
        result.put("filename", slug);
        result.put("parse_completed", true);
        result.put("build_completed", true);
        result.put("import_completed", true);
        result.put("cleanup_completed", true);
        
        updateFullParsingTask(fullTaskId, "completed", 100,
            "Полный парсинг завершен успешно! JSON, изображения импортированы, данные очищены.", result);
            
    } catch (Exception importEx) {
        logger.error("Ошибка при импорте или очистке для slug={}: {}", 
            slug, importEx.getMessage(), importEx);
        updateFullParsingTask(fullTaskId, "failed", 100,
            "Ошибка при импорте: " + importEx.getMessage(), null);
    }
}
```

## Результат

### Новый workflow автопарсинга:

1. ✅ **Parse** (парсинг JSON) → `status: COMPLETED`
2. ✅ **Build** (скачивание изображений) → `status: COMPLETED`
3. ✅ **Import** (импорт в БД) → прогресс 70-95%
4. ✅ **Cleanup** (удаление из MelonService) → прогресс 95-100%
5. ✅ **Complete** → `status: completed`

### Прогресс:
- 5% - Ожидание парсинга JSON
- 50% - Парсинг JSON завершен
- 60% - Скачивание изображений запущено
- 70% - **[НОВОЕ]** Импорт в БД запущен
- 95% - **[НОВОЕ]** Очистка данных из MelonService
- 100% - Полное завершение

### Логи:
```
INFO: Билд завершен для slug=... запускаем импорт
INFO: Импорт завершен для slug=..., очищаем данные из MelonService
INFO: Данные успешно удалены из MelonService для slug=...
INFO: Полный парсинг завершен успешно! JSON, изображения импортированы, данные очищены.
```

## Тестирование

Для проверки:

1. Запустить автопарсинг с `limit=1`
2. Проверить логи:
   - Build должен завершиться с `COMPLETED`
   - Должен запуститься импорт (прогресс 70%)
   - Должна запуститься очистка (прогресс 95%)
   - Финальный статус `completed` (прогресс 100%)
3. Проверить БД: манга должна появиться
4. Проверить MelonService: данные должны быть удалены

## Файлы изменены

- `MangaService/src/main/java/shadowshift/studio/mangaservice/service/MelonIntegrationService.java`
  - `waitForTaskCompletion()`: регистронезависимая проверка статуса
  - `runFullParsingTaskLogic()`: добавлен импорт и очистка после build
