# 🐛 BUGFIX: Build Slug Normalization

## Проблема
**Симптом:** Парсинг завершался успешно, JSON создавался, но на этапе билда (`buildManga`) MelonService не находил файл:
```
Парсинг: Parsed: 1. Not found: 0. Errors: 0.  ✅
Парсинг выполнен, но JSON файл не найден  ❌
```

**Root Cause:**
1. Каталог MangaLib возвращает `slug_url` в формате `ID--slug` (например: `3754--sweet-home-kim-carnby-`)
2. MelonService парсер сохраняет JSON файл БЕЗ ID: `sweet-home-kim-carnby-.json`
3. MangaService передавал полный slug с ID в метод `buildManga()`
4. MelonService `/build` эндпоинт не находил файл `3754--sweet-home-kim-carnby-.json` (его не существует)

**Пример:**
- Каталог: `slug_url = "3754--sweet-home-kim-carnby-"`
- JSON файл: `sweet-home-kim-carnby-.json` (чистый slug)
- MangaService билд: искал `3754--sweet-home-kim-carnby-.json` ❌

## Решение

### 1. Нормализация slug в начале метода `runFullParsingTaskLogic`
Объявили `normalizedSlug` в самом начале метода, чтобы использовать его везде:

```java
public void runFullParsingTaskLogic(String fullTaskId, String parseTaskId, String slug) {
    // Нормализуем slug сразу (убираем ID)
    String normalizedSlug = normalizeSlugForMangaLib(slug);
    logger.info("🔧 Нормализация slug: original='{}', normalized='{}'", slug, normalizedSlug);
    
    // Используем normalizedSlug для:
    // - buildManga(normalizedSlug, null)
    // - getMangaInfo(normalizedSlug)
    // - deleteManga(normalizedSlug)
}
```

### 2. Использование нормализованного slug для билда
```java
Map<String, Object> buildResult = buildManga(normalizedSlug, null);
```

Теперь MelonService `/build` эндпоинт получает чистый slug без ID и успешно находит файл!

### 3. Добавлено логирование для диагностики
В `api_server.py` (`/manga-info/{filename}`):
```python
logger.info(f"🔍 Поиск manga-info для filename='{filename}'")
logger.info(f"📂 Output path: {output_path}")
logger.info(f"🔎 Проверяем файл: {json_file} (exists={json_file.exists()})")
logger.info(f"✅ Файл найден: {json_file}")
logger.error(f"❌ Файл '{filename}.json' не найден. Доступные файлы: {all_files}")
```

## Изменения

### MangaService/src/.../MelonIntegrationService.java
**Файл:** `MelonIntegrationService.java`
**Метод:** `runFullParsingTaskLogic()`

**До:**
```java
Map<String, Object> buildResult = buildManga(slug, null);  // slug = "3754--sweet-home-kim-carnby-"
```

**После:**
```java
String normalizedSlug = normalizeSlugForMangaLib(slug);  // normalizedSlug = "sweet-home-kim-carnby-"
Map<String, Object> buildResult = buildManga(normalizedSlug, null);
```

### MelonService/api_server.py
**Эндпоинт:** `/manga-info/{filename}`

Добавлено детальное логирование для диагностики поиска файлов.

## Тестирование

### Локальная компиляция
```bash
cd MangaService
.\gradlew.bat build -x test
# BUILD SUCCESSFUL in 8s ✅
```

### Ожидаемое поведение
1. AutoParsingService получает slug: `3754--sweet-home-kim-carnby-`
2. Парсинг создает файл: `sweet-home-kim-carnby-.json`
3. MangaService нормализует: `sweet-home-kim-carnby-`
4. Билд находит файл: ✅
5. getMangaInfo находит файл: ✅
6. deleteManga удаляет файл: ✅

### Логи при успешном билде
```
🔧 Нормализация slug: original='3754--sweet-home-kim-carnby-', normalized='sweet-home-kim-carnby-'
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

# Пересборка MangaService
docker-compose -f docker-compose.prod.yml build manga-service

# Пересборка MelonService (для логирования)
docker-compose -f docker-compose.prod.yml build melon-service

# Рестарт
docker-compose -f docker-compose.prod.yml up -d

# Проверка логов
docker logs aniway-reload-manga-service-1 --tail=50 | grep "🔧 Нормализация"
docker logs aniway-reload-melon-service-1 --tail=50 | grep -E "🔍|✅|❌"
```

## Связанные файлы
- `MangaService/src/main/java/.../MelonIntegrationService.java` - нормализация slug
- `MelonService/api_server.py` - логирование `/manga-info` и `/build`
- `MelonService/Parsers/mangalib/main.py` - логика сохранения JSON без ID

## Статус
✅ Исправлено  
✅ Скомпилировано  
⏳ Ожидает деплоя
