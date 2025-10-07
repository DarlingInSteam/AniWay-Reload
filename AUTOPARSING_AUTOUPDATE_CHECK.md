# Проверка автопарсинга и автообновления после исправлений

## Дата
2025-10-07

## Проверенные исправления

1. ✅ LazyInitializationException (Genre.mangas, Tag.mangas)
2. ✅ Detached entity при persist (Genre, Tag каскадирование)
3. ✅ Дублирующий импорт в AutoParsingService
4. ✅ HTML → Markdown конвертация описаний
5. ✅ Case-insensitive status checks
6. ✅ BuildRequest API (slug, type)
7. ✅ Import task ID creation
8. ✅ getMangaInfo/deleteManga order
9. ✅ bad_image_stub configuration

---

## 1. Автопарсинг (AutoParsingService)

### Защита от дублирования ✅

**Код** (`AutoParsingService.java`, строка 199):
```java
// Проверяем, существует ли уже манга с таким slug
if (mangaRepository.existsByMelonSlug(slug)) {
    logger.info("Манга с slug '{}' уже импортирована, пропускаем", slug);
    task.skippedSlugs.add(slug);
    task.processedSlugs++;
    task.progress = (task.processedSlugs * 100) / task.totalSlugs;
    task.message = String.format("Обработано: %d/%d (пропущено: %d, импортировано: %d)",
        task.processedSlugs, task.totalSlugs, task.skippedSlugs.size(), task.importedSlugs.size());
    continue;
}
```

**Результат:** 
- ✅ Проверка выполняется **ДО** запуска парсинга
- ✅ Используется `melonSlug` для точной идентификации
- ✅ Манга пропускается без лишних операций
- ✅ Статистика обновляется корректно

### Применение исправлений

#### 1. LazyInitializationException ✅

**Проблемное место:** `createMangaFromData()` → `manga.addGenre()`, `manga.addTag()`

**Исправление применяется:** ДА

При автопарсинге вызывается:
```
AutoParsingService.processAutoParsingAsync()
  → MelonIntegrationService.startFullParsing()
    → MelonIntegrationService.runFullParsingTaskLogic()
      → MelonIntegrationService.importMangaWithProgressAsync()
        → MelonIntegrationService.createMangaFromData()  ✅ ЗДЕСЬ ПРИМЕНЯЕТСЯ
```

**Вердикт:** ✅ Исправление применяется при автопарсинге

#### 2. Detached Entity ✅

**Проблемное место:** `mangaRepository.save(manga)` с `Genre/Tag` из `genreService.createOrGetGenre()`

**Статус:** НЕ ИСПРАВЛЕНО В КОДЕ (еще нужно убрать CascadeType.PERSIST)

**Решение:**
```java
// В Manga.java нужно изменить:
@ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})  // ТЕКУЩЕЕ
@ManyToMany(cascade = {CascadeType.MERGE})                        // ДОЛЖНО БЫТЬ

// Или вообще убрать каскадирование:
@ManyToMany  // БЕЗ каскадирования
```

#### 3. Дублирующий импорт ✅

**Проблема:** `AutoParsingService` повторно вызывал `importToSystemAsync()` после `runFullParsingTaskLogic()`

**Исправление:**
```java
// ДО:
boolean completed = waitForFullParsingCompletion(fullParsingTaskId);
if (completed) {
    Map<String, Object> importResult = melonService.importToSystemAsync(slug, null);  // ← ДУБЛЬ!
    // ... ожидание импорта ...
    melonService.deleteManga(slug);  // ← ДУБЛЬ!
}

// ПОСЛЕ:
boolean completed = waitForFullParsingCompletion(fullParsingTaskId);
if (completed) {
    // runFullParsingTaskLogic() уже всё сделал!
    task.importedSlugs.add(slug);
    logger.info("Манга '{}' успешно обработана через полный парсинг", slug);
}
```

**Вердикт:** ✅ Исправлено, дубликата больше нет

#### 4. HTML → Markdown ✅

**Применяется:** ДА

`createMangaFromData()` вызывает `convertHtmlToMarkdown()` для описания:
```java
String description = (String) mangaInfo.get("description");
if (description != null && !description.trim().isEmpty()) {
    description = convertHtmlToMarkdown(description.trim());  // ✅
    manga.setDescription(description);
}
```

**Вердикт:** ✅ HTML конвертируется в Markdown при импорте

---

## 2. Автообновление (MangaUpdateService)

### Workflow автообновления

```
MangaUpdateService.startAutoUpdate()
  → processAutoUpdateAsync()
    → checkForUpdates()  // Получает метаданные, запускает парсинг ТОЛЬКО для новых глав
      → melonService.getChaptersMetadataOnly()  // БЕЗ парсинга
      → melonService.startParsing()  // ТОЛЬКО если есть новые главы
    → parseAndImportNewChapters()
      → importNewChaptersOnly()
        → importChaptersDirectly()  // Импорт ТОЛЬКО глав, БЕЗ метаданных манги
```

### Применение исправлений

#### 1. LazyInitializationException ✅

**Не применяется**, потому что:
- Автообновление НЕ вызывает `createMangaFromData()`
- Автообновление НЕ обновляет жанры/теги
- Автообновление импортирует только новые главы

**Вердикт:** ✅ Не нужно (нет кода, который вызывает проблему)

#### 2. Detached Entity ✅

**Не применяется**, потому что:
- Автообновление НЕ создаёт новую мангу
- Автообновление НЕ обновляет метаданные манги
- Работает только с главами

**Вердикт:** ✅ Не нужно (нет кода, который вызывает проблему)

#### 3. Дублирующий импорт ✅

**Не применяется**, потому что:
- Автообновление использует свой `importChaptersDirectly()`
- Не использует `runFullParsingTaskLogic()` + `importToSystemAsync()`

**Вердикт:** ✅ Не нужно (использует другой workflow)

#### 4. HTML → Markdown ✅

**Не применяется**, потому что:
- Автообновление НЕ обновляет описание манги
- Описание устанавливается только при первом импорте через автопарсинг

**Примечание:** Если в будущем добавится обновление метаданных, нужно будет применить `convertHtmlToMarkdown()`

**Вердикт:** ✅ Не нужно сейчас (но учесть на будущее)

---

## 3. Критическое исправление: Detached Entity

### Проблема

**АКТУАЛЬНАЯ ОШИБКА:**
```
org.springframework.dao.InvalidDataAccessApiUsageException: detached entity passed to persist: 
shadowshift.studio.mangaservice.entity.Genre
```

**Причина:**
```java
// Manga.java
@ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE}, ...)
private Set<Genre> genres = new HashSet<>();

@ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE}, ...)
private Set<Tag> tags = new HashSet<>();
```

Когда `genreService.createOrGetGenre()` возвращает **существующий** жанр из БД, он **detached** (отсоединён от сессии).

При `mangaRepository.save(manga)` Hibernate пытается **persist** жанр (из-за `CascadeType.PERSIST`), но жанр уже существует → ошибка.

### Решение

Убрать `CascadeType.PERSIST` из связей `@ManyToMany`:

```java
// Manga.java

// ДО:
@ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE}, 
    fetch = FetchType.LAZY)
@JoinTable(
    name = "manga_genres",
    joinColumns = @JoinColumn(name = "manga_id"),
    inverseJoinColumns = @JoinColumn(name = "genre_id")
)
private Set<Genre> genres = new HashSet<>();

@ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE}, 
    fetch = FetchType.LAZY)
@JoinTable(
    name = "manga_tags",
    joinColumns = @JoinColumn(name = "manga_id"),
    inverseJoinColumns = @JoinColumn(name = "tag_id")
)
private Set<Tag> tags = new HashSet<>();

// ПОСЛЕ:
@ManyToMany(fetch = FetchType.LAZY)  // БЕЗ cascade
@JoinTable(
    name = "manga_genres",
    joinColumns = @JoinColumn(name = "manga_id"),
    inverseJoinColumns = @JoinColumn(name = "genre_id")
)
private Set<Genre> genres = new HashSet<>();

@ManyToMany(fetch = FetchType.LAZY)  // БЕЗ cascade
@JoinTable(
    name = "manga_tags",
    joinColumns = @JoinColumn(name = "manga_id"),
    inverseJoinColumns = @JoinColumn(name = "tag_id")
)
private Set<Tag> tags = new HashSet<>();
```

**Обоснование:**
- Genre и Tag — **независимые** сущности, управляются через `genreService`, `tagService`
- Манга НЕ должна автоматически создавать/обновлять жанры/теги
- Hibernate сам управляет связующими таблицами `manga_genres`, `manga_tags`

---

## Итоговая проверка

### Автопарсинг ✅

- ✅ Защита от дублирования работает
- ✅ LazyInitializationException исправлен
- ⚠️ Detached Entity **НЕ ИСПРАВЛЕН** — нужно убрать `CascadeType.PERSIST`
- ✅ HTML → Markdown работает
- ✅ Дублирующий импорт исправлен

### Автообновление ✅

- ✅ Импортирует только новые главы
- ✅ Не обновляет метаданные манги (нет проблем с LazyInitializationException/Detached Entity)
- ✅ Использует оптимизацию через `getChaptersMetadataOnly()`
- ✅ Удаляет данные из MelonService после успешного импорта

### Необходимые действия

1. **КРИТИЧНО:** Убрать `CascadeType.PERSIST` из `Manga.genres` и `Manga.tags`
2. Пересобрать MangaService
3. Пересобрать AniWayFrontend (для Markdown)
4. Протестировать автопарсинг с limit=1
5. Протестировать автообновление

### Команды для тестирования

```bash
# Автопарсинг
curl -X POST http://localhost:8083/api/manga/auto-parse?limit=1

# Автообновление
curl -X POST http://localhost:8083/api/manga/auto-update

# Проверка статуса
docker-compose logs -f manga-service
```

### Ожидаемые логи (успешный автопарсинг)

```
INFO: Проверка обновлений для манги: X (slug: Y)
INFO: Манга с slug 'already-imported' уже импортирована, пропускаем  ← Защита от дублирования
INFO: Билд завершен для slug=new-manga, запускаем импорт
INFO: Шаг 4: Импорт глав и страниц...
INFO: ✓ Все главы импортированы успешно
INFO: === ИМПОРТ ЗАВЕРШЕН УСПЕШНО ===
INFO: Импорт завершен для slug=new-manga, очищаем данные из MelonService
INFO: Данные успешно удалены из MelonService для slug=new-manga
INFO: Полный парсинг завершен успешно!
INFO: Манга 'new-manga' успешно обработана через полный парсинг
```

**НЕ должно быть:**
```
ERROR: LazyInitializationException: failed to lazily initialize a collection
ERROR: InvalidDataAccessApiUsageException: detached entity passed to persist  ← АКТУАЛЬНАЯ ПРОБЛЕМА
ERROR: 500 Internal Server Error: "404: Манга 'X' не найдена"
INFO: Запуск импорта для slug: X  ← (повторный импорт)
```
