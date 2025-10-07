# Критические проблемы и исправления

## ❌ Проблема 1: melonSlug не сохраняется при импорте

### Описание
В методе `MelonIntegrationService.createMangaFromData()` **НЕ устанавливается** `melonSlug`, хотя filename (который и есть slug) передается как параметр.

### Последствия
- Автопарсинг не может проверить дубликаты (всегда `melonSlug = null`)
- Автообновление не может найти манги для обновления (фильтр по `melonSlug != null` вернет 0 манг)
- Невозможно связать мангу с источником в Melon

### Местоположение
`MangaService/src/main/java/shadowshift/studio/mangaservice/service/MelonIntegrationService.java`
Метод: `createMangaFromData(Map<String, Object> mangaInfo, String filename)`
Строка: ~774

### Исправление
```java
private Manga createMangaFromData(Map<String, Object> mangaInfo, String filename) {
    Manga manga = new Manga();

    // ✅ КРИТИЧНО: Устанавливаем melonSlug из filename
    manga.setMelonSlug(filename);

    // Обрабатываем title - используем localized_name (русское название)
    String title = (String) mangaInfo.get("localized_name");
    // ... остальной код
}
```

---

## ❌ Проблема 2: Несуществующие endpoints в MelonService

### Описание
`MangaUpdateService` вызывает endpoints, которых НЕТ в MelonService:
- `POST /check-updates` - не существует
- `POST /parse-new-chapters` - не существует

### Текущие endpoints в MelonService (api_server.py)
```python
POST /parse          # парсинг одной манги
POST /build          # билд изображений
POST /batch-parse    # пакетный парсинг
POST /batch-start    # альтернативный пакетный парсинг
GET  /list-parsed    # список спарсенных
GET  /manga-info/{slug}  # информация о манге
DELETE /delete/{slug}    # удаление манги
```

### Последствия
- `MangaUpdateService.checkForUpdates()` вызовет 404 ошибку
- `MangaUpdateService.requestParseNewChapters()` вызовет 404 ошибку
- Автообновление **не будет работать вообще**

### Решение
Есть 2 варианта:

**Вариант 1 (рекомендуемый):** Упростить автообновление
```java
// Вместо проверки новых глав через Melon:
// 1. Запустить полный парсинг манги: POST /parse
// 2. После парсинга получить данные: GET /manga-info/{slug}
// 3. Сравнить главы в Java коде
// 4. Импортировать только новые
// 5. Удалить из Melon: DELETE /delete/{slug}
```

**Вариант 2:** Добавить endpoints в MelonService (см. MELON_SERVICE_API_CHANGES.md)

---

## ❌ Проблема 3: Логика проверки дубликатов глав

### Описание
В `MangaUpdateService.importNewChaptersOnly()` используется логика фильтрации глав, которая может пропустить главы из-за различий в формате номеров.

### Код с проблемой
```java
for (Map<String, Object> chapter : branchChapters) {
    Object numberObj = chapter.get("number");
    if (numberObj != null) {
        // Проверяем, является ли эта глава новой
        boolean isNewChapter = newChapters.stream()
            .anyMatch(nc -> Objects.equals(nc.get("number"), numberObj));
        // ⚠️ Проблема: сравнение может не сработать если типы разные
        // Например: "5.0" (String) vs 5.0 (Double)
    }
}
```

### Исправление
```java
boolean isNewChapter = newChapters.stream()
    .anyMatch(nc -> {
        String ncNumber = String.valueOf(nc.get("number"));
        String chNumber = String.valueOf(numberObj);
        return ncNumber.equals(chNumber);
    });
```

---

## ❌ Проблема 4: filename vs slug путаница

### Описание
В коде используется параметр `filename`, но по сути это `slug` манги из MangaLib.

**Пример slug манги на MangaLib:**
```
https://mangalib.me/solo-leveling
                     ^^^^^^^^^^^^
                     это slug
```

### Где используется
- `MelonIntegrationService.getMangaInfo(String filename)` - на самом деле это slug
- `MelonIntegrationService.importToSystemAsync(String filename, ...)` - это slug
- `MelonIntegrationService.deleteManga(String filename)` - это slug

### Рекомендация
Переименовать параметры для ясности (опционально, но улучшит читаемость):
```java
// Было
public Map<String, Object> getMangaInfo(String filename)

// Лучше
public Map<String, Object> getMangaInfo(String slug)
```

---

## ❌ Проблема 5: MangaUpdateService.importChapterPages() не реализован

### Описание
```java
private void importChapterPages(Long chapterId, List<Map<String, Object>> slides, 
                               String mangaFilename, String originalChapterName) {
    // Реализация аналогична MelonIntegrationService.importChapterPagesFromMelonService
    // Для краткости опущена, так как логика идентична
    logger.info("Импорт {} страниц для главы {}", slides.size(), chapterId);
}
```

### Последствия
Страницы глав НЕ БУДУТ импортироваться при автообновлении!

### Исправление
Нужно скопировать реализацию из `MelonIntegrationService.importChapterPagesFromMelonService()` или вызвать его напрямую.

---

## ✅ Что работает правильно

1. ✅ **AutoParsingService** - логика верная (после исправления проблемы #1)
2. ✅ **Проверка дубликатов манг** - `existsByMelonSlug()` правильно используется
3. ✅ **Проверка дубликатов глав** - `chapterExists()` правильно реализован
4. ✅ **Frontend компонент** - UI корректный
5. ✅ **ParserController endpoints** - все endpoints правильно объявлены
6. ✅ **ChapterService.chapterExists()** - метод добавлен корректно

---

## 📋 Приоритет исправлений

### Критичные (без них не работает):
1. **Проблема #1** - добавить `manga.setMelonSlug(filename)`
2. **Проблема #2** - упростить `MangaUpdateService` или добавить endpoints в Melon
5. **Проблема #5** - реализовать `importChapterPages()`

### Желательные (улучшат надежность):
3. **Проблема #3** - исправить сравнение номеров глав
4. **Проблема #4** - переименовать для ясности (опционально)

---

## 🔧 Рекомендуемый порядок исправления

1. Исправить `createMangaFromData()` - добавить `setMelonSlug()`
2. Упростить `MangaUpdateService`:
   - Убрать вызовы несуществующих endpoints
   - Использовать существующий парсинг
   - Сравнивать главы в Java коде
3. Реализовать `importChapterPages()` в `MangaUpdateService`
4. Протестировать автопарсинг
5. Протестировать автообновление
