# Фикс: Ошибка "JSON файл не найден" при автопарсинге после 3-4 тайтлов

## Дата
2025-10-07

## Проблема

При массовом импорте манг (целая страница каталога) после 3-4 успешных тайтлов начинаются ошибки:
- **"JSON файл не найден"** (`manga-info` endpoint возвращает 404)
- Тайтлы скипаются с ошибкой
- Автопарсинг прерывается

## Причина

### 1. Отсутствие обработки ошибок в `getMangaInfo()`

**Файл:** `MelonIntegrationService.java`

**Код ДО:**
```java
public Map<String, Object> getMangaInfo(String filename) {
    String url = melonServiceUrl + "/manga-info/" + filename;
    ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
    return response.getBody();
}
```

**Проблема:**
- При массовом парсинге MelonService может не успевать создавать JSON файлы
- `restTemplate.getForEntity()` падает с **HttpClientErrorException.NotFound** (404)
- **Вся задача автопарсинга прерывается** из-за необработанного исключения

### 2. Отсутствие обработки ошибок в `getTaskStatus()`

**Файл:** `MelonIntegrationService.java`

**Код ДО:**
```java
public Map<String, Object> getTaskStatus(String taskId) {
    String url = melonServiceUrl + "/status/" + taskId;
    ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
    return response.getBody();
}
```

**Проблема:**
- Задачи могут временно исчезать из MelonService
- `restTemplate.getForEntity()` падает с 404
- Бесконечный цикл `waitForTaskCompletion()` не может обработать ошибку

## Решение

### 1. Добавлена retry логика в `getMangaInfo()`

**Код ПОСЛЕ:**
```java
public Map<String, Object> getMangaInfo(String filename) {
    String url = melonServiceUrl + "/manga-info/" + filename;
    
    int maxRetries = 5;
    int retryDelayMs = 3000; // 3 секунды между попытками
    
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            logger.info("Получение manga-info для '{}' (попытка {}/{})", filename, attempt, maxRetries);
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            Map<String, Object> body = response.getBody();
            
            if (body != null) {
                logger.info("Успешно получен manga-info для '{}'", filename);
                return body;
            } else {
                logger.warn("Пустой ответ при получении manga-info для '{}', попытка {}/{}", 
                    filename, attempt, maxRetries);
            }
            
        } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
            logger.warn("JSON файл не найден для '{}' (попытка {}/{}): {}. " +
                "Возможно, MelonService еще не завершил создание файла. Повторная попытка через {}ms...",
                filename, attempt, maxRetries, e.getMessage(), retryDelayMs);
                
        } catch (Exception e) {
            logger.error("Ошибка получения manga-info для '{}' (попытка {}/{}): {}", 
                filename, attempt, maxRetries, e.getMessage());
        }
        
        // Если не последняя попытка - ждем перед retry
        if (attempt < maxRetries) {
            try {
                Thread.sleep(retryDelayMs);
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                logger.error("Прервано ожидание retry для '{}'", filename);
                break;
            }
        }
    }
    
    // Если все попытки исчерпаны - возвращаем пустой результат
    logger.error("Не удалось получить manga-info для '{}' после {} попыток", filename, maxRetries);
    return Map.of(
        "error", "Не удалось получить manga-info после " + maxRetries + " попыток",
        "filename", filename
    );
}
```

**Улучшения:**
- ✅ **5 попыток** с задержкой 3 секунды
- ✅ Специфическая обработка **404 ошибок**
- ✅ Детальное логирование каждой попытки
- ✅ **Graceful degradation** - возврат Map с ошибкой вместо exception

### 2. Добавлена обработка ошибок в `getTaskStatus()`

**Код ПОСЛЕ:**
```java
public Map<String, Object> getTaskStatus(String taskId) {
    String url = melonServiceUrl + "/status/" + taskId;
    
    try {
        ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
        Map<String, Object> body = response.getBody();
        
        if (body != null) {
            return body;
        } else {
            logger.warn("Пустой ответ при запросе статуса задачи: {}", taskId);
            return Map.of(
                "status", "unknown",
                "message", "Пустой ответ от MelonService"
            );
        }
        
    } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
        logger.warn("Задача не найдена в MelonService: {} (возможно, еще не создана или уже удалена)", taskId);
        return Map.of(
            "status", "not_found",
            "message", "Задача не найдена в MelonService"
        );
        
    } catch (Exception e) {
        logger.error("Ошибка получения статуса задачи {}: {}", taskId, e.getMessage());
        return Map.of(
            "status", "error",
            "message", "Ошибка получения статуса: " + e.getMessage()
        );
    }
}
```

**Улучшения:**
- ✅ Обработка **404 ошибок**
- ✅ Обработка **пустых ответов**
- ✅ Обработка **общих исключений**
- ✅ **Graceful degradation** - всегда возвращает Map

## Сценарии обработки

### Сценарий 1: JSON файл еще не создан

```
Попытка 1: GET /manga-info/another → 404 (файл не готов)
  ↓
Задержка 3 секунды
  ↓
Попытка 2: GET /manga-info/another → 404 (файл все еще не готов)
  ↓
Задержка 3 секунды
  ↓
Попытка 3: GET /manga-info/another → 200 (файл создан!)
  ↓
✅ Успешно получен manga-info
```

### Сценарий 2: JSON файл так и не был создан

```
Попытка 1-5: GET /manga-info/another → 404
  ↓
Все попытки исчерпаны
  ↓
Возврат: {error: "Не удалось получить manga-info после 5 попыток", filename: "another"}
  ↓
❌ Импорт завершается с ошибкой, но автопарсинг ПРОДОЛЖАЕТСЯ для следующих манг
```

### Сценарий 3: Задача временно недоступна

```
waitForTaskCompletion(taskId):
  ↓
Попытка 1: GET /status/xxx-yyy → 404
  ↓
getTaskStatus() возвращает: {status: "not_found", message: "..."}
  ↓
Попытка 2: GET /status/xxx-yyy → 200 {status: "running"}
  ↓
✅ Ожидание продолжается корректно
```

## Влияние на автопарсинг

### ДО фикса:
```
Манга 1: ✅ Успешно
Манга 2: ✅ Успешно
Манга 3: ✅ Успешно
Манга 4: ❌ JSON не найден → EXCEPTION → ВСЯ ЗАДАЧА ПРЕРЫВАЕТСЯ
Манга 5: ⏭️ Пропущена
Манга 6: ⏭️ Пропущена
...
```

### ПОСЛЕ фикса:
```
Манга 1: ✅ Успешно
Манга 2: ✅ Успешно
Манга 3: ✅ Успешно
Манга 4: 🔄 JSON не найден → RETRY (5 попыток) → ✅ Успешно ИЛИ ❌ Ошибка (graceful)
Манга 5: ✅ Продолжается независимо от результата Манга 4
Манга 6: ✅ Продолжается
...
```

## Логи

### Успешный retry:
```
INFO: Получение manga-info для 'another' (попытка 1/5)
WARN: JSON файл не найден для 'another' (попытка 1/5): 404 NOT_FOUND. 
      Возможно, MelonService еще не завершил создание файла. Повторная попытка через 3000ms...
INFO: Получение manga-info для 'another' (попытка 2/5)
INFO: Успешно получен manga-info для 'another'
```

### Исчерпаны все попытки:
```
INFO: Получение manga-info для 'broken-manga' (попытка 1/5)
WARN: JSON файл не найден для 'broken-manga' (попытка 1/5): 404 NOT_FOUND...
...
INFO: Получение manga-info для 'broken-manga' (попытка 5/5)
WARN: JSON файл не найден для 'broken-manga' (попытка 5/5): 404 NOT_FOUND...
ERROR: Не удалось получить manga-info для 'broken-manga' после 5 попыток
ERROR: Ошибка при импорте или очистке для slug=broken-manga: ...
```

## Измененные файлы

1. **MangaService/src/main/java/shadowshift/studio/mangaservice/service/MelonIntegrationService.java**
   - Метод `getMangaInfo()`: Добавлена retry логика (5 попыток × 3 сек)
   - Метод `getTaskStatus()`: Добавлена обработка ошибок

## Команды для пересборки

```bash
# Пересборка MangaService
cd C:\project\AniWayImageSystem\AniWay-Reload\MangaService
.\gradlew.bat build -x test

# Пересборка Docker образа
cd C:\project\AniWayImageSystem\AniWay-Reload
docker-compose build manga-service

# Перезапуск
docker-compose up -d manga-service
```

## Тестирование

### Тест 1: Автопарсинг с limit=10

```bash
curl -X POST "http://localhost:8083/api/manga/auto-parse?page=1&limit=10"
```

**Ожидаемое поведение:**
- Все 10 манг обрабатываются последовательно
- При временных ошибках 404 → retry до 5 раз
- Даже если 1 манга упала с ошибкой → остальные 9 продолжают обработку

### Тест 2: Проверка логов

```bash
docker-compose logs -f manga-service | grep -E "(Получение manga-info|попытка|Успешно получен|исчерпаны)"
```

**Ожидаемые логи:**
- Попытки получения manga-info
- Retry при 404
- Успешное получение ИЛИ сообщение об исчерпании попыток

### Тест 3: Мониторинг статуса автопарсинга

```bash
# Получить taskId из предыдущего запроса
curl "http://localhost:8083/api/manga/auto-parse-status/{taskId}"
```

**Ожидаемое поведение:**
- `processed_slugs` растет непрерывно
- `failed_slugs` содержит только реально проблемные манги
- `logs` содержат информацию о retry

## Дополнительные улучшения

### Возможные будущие оптимизации:

1. **Экспоненциальная задержка retry:**
   ```java
   int retryDelayMs = 1000 * (1 << (attempt - 1)); // 1s, 2s, 4s, 8s, 16s
   ```

2. **Circuit Breaker Pattern:**
   - Если MelonService падает для 3+ манг подряд → временно приостановить автопарсинг
   
3. **Параллельный парсинг:**
   - Обрабатывать 2-3 манги одновременно (требует изменений в MelonService)

4. **Health check MelonService:**
   - Перед автопарсингом проверять доступность MelonService

## Итог

**✅ ИСПРАВЛЕНО:** Автопарсинг теперь устойчив к временным проблемам с JSON файлами

**Механизмы защиты:**
1. Retry логика в `getMangaInfo()` (5 × 3 сек)
2. Graceful degradation - ошибки не прерывают весь автопарсинг
3. Детальное логирование для диагностики
4. Обработка ошибок в `getTaskStatus()`

**Время восстановления:**
- Максимум 15 секунд на 1 мангу (5 попыток × 3 сек)
- Автопарсинг продолжается независимо от отдельных ошибок
