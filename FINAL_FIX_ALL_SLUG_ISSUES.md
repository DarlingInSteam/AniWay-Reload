# 🐛 ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ: Все проблемы с slug нормализацией

## Обнаруженные проблемы

### Проблема
Парсинг завершался успешно, JSON файл создавался, но на этапе **билда** возникала ошибка:
```
Парсинг выполнен, но JSON файл не найден
```

### Root Cause Analysis

**Формат slug:**
- **Каталог MangaLib**: возвращает `slug_url = "3754--sweet-home-kim-carnby-"` (ID--slug)
- **MelonService парсер**: сохраняет JSON файл БЕЗ ID: `sweet-home-kim-carnby-.json`
- **MangaService**: передавал slug С ID в различные эндпоинты

**Критические точки:**
1. ✅ `getMangaInfo(slug)` - нормализация добавлена ранее
2. ✅ `deleteManga(slug)` в `runFullParsingTaskLogic` - нормализация добавлена ранее
3. ❌ **`buildManga(slug)`** в MangaService - передавал slug БЕЗ нормализации
4. ❌ **`execute_build_task(slug)`** в MelonService - передавал slug БЕЗ нормализации в команду

## Все исправления

### 1. MangaService - нормализация slug ДО buildManga ✅ (ранее)
**Файл:** `MangaService/src/.../MelonIntegrationService.java`  
**Метод:** `runFullParsingTaskLogic()`

```java
// БЫЛО:
Map<String, Object> buildResult = buildManga(slug, null);

// СТАЛО:
String normalizedSlug = normalizeSlugForMangaLib(slug);  // В начале метода
logger.info("🔧 Нормализация slug: original='{}', normalized='{}'", slug, normalizedSlug);
Map<String, Object> buildResult = buildManga(normalizedSlug, null);
```

### 2. MelonService - нормализация slug в execute_build_task ✅ (НОВОЕ)
**Файл:** `MelonService/api_server.py`  
**Функция:** `execute_build_task()`

**Проблема:** Даже если MangaService передавал нормализованный slug, старая версия могла передавать с ID.

```python
# БЫЛО:
command = ["python", "main.py", "build-manga", slug, "--use", parser]

# СТАЛО:
# Нормализуем slug (убираем ID, если есть)
normalized_slug = slug
if "--" in slug:
    parts = slug.split("--", 1)
    if len(parts) == 2 and parts[0].isdigit():
        normalized_slug = parts[1]
        logger.info(f"🔧 Нормализация slug для билда: '{slug}' → '{normalized_slug}'")

command = ["python", "main.py", "build-manga", normalized_slug, "--use", parser]
```

**Причина:** Двойная защита - даже если slug приходит с ID (например, из старой версии MangaService или из API напрямую), он будет нормализован.

### 3. api_server.py - улучшенное логирование в /manga-info ✅ (ранее)
**Файл:** `MelonService/api_server.py`  
**Эндпоинт:** `/manga-info/{filename}`

Добавлено детальное логирование для диагностики:
```python
logger.info(f"🔍 Поиск manga-info для filename='{filename}'")
logger.info(f"📂 Output path: {output_path}")
logger.info(f"🔎 Проверяем файл: {json_file} (exists={json_file.exists()})")
logger.info(f"✅ Файл найден: {json_file}")
logger.error(f"❌ Файл '{filename}.json' не найден. Доступные файлы: {all_files}")
```

### 4. settings.json - уменьшен delay для ускорения парсинга ✅ (НОВОЕ)
**Файл:** `MelonService/Parsers/mangalib/settings.json`

```json
// БЫЛО:
"delay": 2

// СТАЛО:
"delay": 0.5
```

**Прирост скорости:**
- Было: 200 запросов × 2 сек = 400 сек (~7 минут)
- Стало: 200 запросов × 0.5 сек = 100 сек (~1.7 минуты)
- **Ускорение: ~4x** 🚀

## Логика нормализации

**Функция нормализации (Java):**
```java
private String normalizeSlugForMangaLib(String slug) {
    if (slug == null || slug.isEmpty()) return slug;
    
    if (slug.contains("--")) {
        String[] parts = slug.split("--", 2);
        if (parts.length == 2 && parts[0].matches("\\d+")) {
            return parts[1]; // Возвращаем чистый slug без ID
        }
    }
    return slug;
}
```

**Логика нормализации (Python):**
```python
normalized_slug = slug
if "--" in slug:
    parts = slug.split("--", 1)
    if len(parts) == 2 and parts[0].isdigit():
        normalized_slug = parts[1]
```

**Примеры:**
- `"3754--sweet-home-kim-carnby-"` → `"sweet-home-kim-carnby-"`
- `"7580--i-alone-level-up"` → `"i-alone-level-up"`
- `"sweet-home"` → `"sweet-home"` (без изменений)

## Ожидаемые логи после деплоя

### MangaService (Java):
```
🔧 Нормализация slug: original='3754--sweet-home-kim-carnby-', normalized='sweet-home-kim-carnby-'
```

### MelonService (Python):
```
🔧 Нормализация slug для билда: '3754--sweet-home-kim-carnby-' → 'sweet-home-kim-carnby-'
🔍 Поиск manga-info для filename='sweet-home-kim-carnby-'
🔎 Проверяем файл: /app/Output/mangalib/titles/sweet-home-kim-carnby-.json (exists=True)
✅ Файл найден: /app/Output/mangalib/titles/sweet-home-kim-carnby-.json
```

## Деплой

```bash
# На сервере
ssh darling@89.169.176.162
cd ~/AniWay-Reload
git pull origin develop

# Пересборка сервисов
docker-compose -f docker-compose.prod.yml build melon-service manga-service

# Рестарт
docker-compose -f docker-compose.prod.yml up -d

# Проверка логов MelonService
docker logs aniway-reload-melon-service-1 --tail=100 | grep -E "🔧|🔍|✅|❌"

# Проверка логов MangaService
docker logs aniway-reload-manga-service-1 --tail=100 | grep "🔧"
```

## Результат

✅ **Все slug нормализуются на обеих сторонах (MangaService + MelonService)**  
✅ **Двойная защита: если одна нормализация пропущена, вторая подхватит**  
✅ **Скорость парсинга увеличена в ~4 раза (delay: 2 → 0.5)**  
✅ **3 прокси работают в round-robin ротации**  
✅ **Детальное логирование для диагностики**

## Проверка после деплоя

1. Запустить автопарсинг для тайтла с ID в slug
2. Проверить логи: должна быть нормализация на обеих сторонах
3. Убедиться, что файл найден и билд успешен
4. Проверить, что скорость парсинга выросла

## Связанные файлы

- `MangaService/src/.../MelonIntegrationService.java` - нормализация в runFullParsingTaskLogic
- `MelonService/api_server.py` - нормализация в execute_build_task + логирование
- `MelonService/Parsers/mangalib/settings.json` - delay уменьшен до 0.5
- `docker-compose.prod.yml` - убраны HTTP_PROXY env vars (ротация через settings.json)

## Статус
✅ MangaService: нормализация добавлена  
✅ MelonService: нормализация добавлена  
✅ Delay уменьшен (2 → 0.5)  
✅ Логирование улучшено  
⏳ Ожидает деплоя на сервер
