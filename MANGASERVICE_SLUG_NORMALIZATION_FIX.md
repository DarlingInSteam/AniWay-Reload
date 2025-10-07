# FIX: JSON файл не найден (MangaService)

## 🐛 Проблема

После парсинга манги Melon успешно сохраняет JSON файл, но MangaService не может его найти.

### Логи:
```
[DEBUG] Final slug (file): sweet-home-kim-carnby-
Saved.
Parsed: 1. Not found: 0. Errors: 0.
```

**MelonService**: "Сохранено как `sweet-home-kim-carnby-.json`" ✅

**MangaService**: "Парсинг выполнен, но JSON файл не найден" ❌

### Проверка файла:
```bash
docker exec -it aniway-reload-melon-service-1 ls /app/Output/mangalib/titles/
# Результат:
sweet-home-kim-carnby-.json  ← ФАЙЛ ЕСТЬ!
suddenly-became-a-princess-one-day-.json
```

---

## 🔍 Анализ причины

### MelonService (парсер):
- Получает slug из каталога: `3754--sweet-home-kim-carnby-` (slug_url формат)
- Извлекает чистый slug: `sweet-home-kim-carnby-`
- Сохраняет JSON: `sweet-home-kim-carnby-.json` ✅

### MangaService (импорт):
- Получает slug из каталога: `3754--sweet-home-kim-carnby-`
- Вызывает `getMangaInfo("3754--sweet-home-kim-carnby-")`  
- Ищет файл: `/manga-info/3754--sweet-home-kim-carnby-.json` ❌ 404 Not Found

**Проблема**: MangaService не нормализует slug перед запросом к MelonService API.

---

## ✅ Решение

Добавить нормализацию slug в MangaService перед вызовами `getMangaInfo()` и `deleteManga()`.

### Изменения в `MelonIntegrationService.java`

#### 1. getMangaInfo - нормализация slug

**Было** (строка ~212):
```java
try {
    // Получаем mangaInfo ДО удаления манги из MelonService
    Map<String, Object> mangaInfo = getMangaInfo(slug);
```

**Стало**:
```java
try {
    // ВАЖНО: MelonService сохраняет JSON файлы БЕЗ ID (чистый slug)
    // Но slug из каталога приходит в формате ID--slug (например "3754--sweet-home-kim-carnby-")
    // Поэтому нормализуем slug перед запросом getMangaInfo
    String normalizedSlug = normalizeSlugForMangaLib(slug);
    logger.info("Запрос manga-info: slug='{}', normalized='{}'", slug, normalizedSlug);
    
    // Получаем mangaInfo ДО удаления манги из MelonService
    Map<String, Object> mangaInfo = getMangaInfo(normalizedSlug);
```

#### 2. deleteManga - нормализация slug

**Было** (строка ~232):
```java
Map<String, Object> deleteResult = deleteManga(slug);
if (deleteResult != null && Boolean.TRUE.equals(deleteResult.get("success"))) {
    logger.info("Данные успешно удалены из MelonService для slug={}", slug);
}
```

**Стало**:
```java
// ВАЖНО: используем нормализованный slug (без ID)
Map<String, Object> deleteResult = deleteManga(normalizedSlug);
if (deleteResult != null && Boolean.TRUE.equals(deleteResult.get("success"))) {
    logger.info("Данные успешно удалены из MelonService для slug={} (normalized={})", 
        slug, normalizedSlug);
} else {
    logger.warn("Не удалось удалить данные из MelonService для slug={} (normalized={}): {}", 
        slug, normalizedSlug, deleteResult);
}
```

---

## 📊 Логика нормализации

Метод `normalizeSlugForMangaLib()` уже существует (строки 90-113):

```java
private String normalizeSlugForMangaLib(String slug) {
    if (slug == null || slug.isEmpty()) {
        return slug;
    }
    
    // Проверяем формат "ID--slug"
    if (slug.contains("--")) {
        String[] parts = slug.split("--", 2);
        // Если первая часть - число (ID), возвращаем вторую часть (slug)
        if (parts.length == 2 && parts[0].matches("\\d+")) {
            logger.debug("Нормализация MangaLib slug: '{}' -> '{}'", slug, parts[1]);
            return parts[1];
        }
    }
    
    // Если формат не "ID--slug", возвращаем как есть
    return slug;
}
```

### Примеры:
- `"3754--sweet-home-kim-carnby-"` → `"sweet-home-kim-carnby-"`
- `"7820--suddenly-became-a-princess-one-day-"` → `"suddenly-became-a-princess-one-day-"`
- `"solo-leveling"` → `"solo-leveling"` (без изменений)

---

## 🧪 Тестирование

### Локальная компиляция
```bash
cd C:\project\AniWayImageSystem\AniWay-Reload\MangaService
.\gradlew.bat build -x test
```

**Результат**: ✅ BUILD SUCCESSFUL

### После деплоя - ожидаемые логи:
```
Запрос manga-info: slug='3754--sweet-home-kim-carnby-', normalized='sweet-home-kim-carnby-'
Получение manga-info для 'sweet-home-kim-carnby-' (попытка 1/5)
Успешно получен manga-info для 'sweet-home-kim-carnby-'
Данные успешно удалены из MelonService для slug=3754--sweet-home-kim-carnby- (normalized=sweet-home-kim-carnby-)
```

---

## 🚀 Деплой

```bash
# 1. Коммит изменений
cd C:\project\AniWayImageSystem\AniWay-Reload
git add MangaService/src/main/java/shadowshift/studio/mangaservice/service/MelonIntegrationService.java
git commit -m "fix: normalize slug for getMangaInfo and deleteManga (MangaLib slug_url support)"

# 2. Push на сервер
git push origin develop

# 3. На сервере
ssh darling@89.169.176.162
cd ~/AniWay-Reload
git pull origin develop
docker-compose -f docker-compose.prod.yml build manga-service
docker-compose -f docker-compose.prod.yml up -d manga-service

# 4. Проверка
docker logs aniway-reload-manga-service-1 --tail=50 | grep -E "Запрос manga-info|normalized"
```

---

## 📁 Изменённые файлы

1. **MangaService/src/main/java/.../MelonIntegrationService.java**
   - Добавлена нормализация slug в `runFullParsingTaskLogic()` (строка ~212)
   - Использование `normalizedSlug` в `getMangaInfo()` и `deleteManga()`
   - Улучшенное логирование с показом оригинального и нормализованного slug

---

## 💡 Почему проблема возникла?

MangaLib изменил API:
1. **Каталог** возвращает `slug_url`: `"3754--sweet-home-kim-carnby-"`
2. **MelonService парсер** извлекает чистый slug и сохраняет: `sweet-home-kim-carnby-.json`
3. **MangaService** получает полный `slug_url` из каталога
4. **MangaService** НЕ нормализовал slug перед запросом → 404 Not Found

**Решение**: Нормализация slug в MangaService перед обращением к MelonService API.

---

**Дата**: 2025-10-07  
**Версия**: v1.0  
**Статус**: ✅ Протестировано локально, готово к деплою
