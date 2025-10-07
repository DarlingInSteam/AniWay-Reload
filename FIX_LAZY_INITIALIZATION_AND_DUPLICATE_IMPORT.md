# Исправление LazyInitializationException и дублирующего импорта

## Дата
2025-10-07

## Проблемы

### 1. LazyInitializationException при импорте манги

**Ошибка:**
```
org.hibernate.LazyInitializationException: failed to lazily initialize a collection of role: 
shadowshift.studio.mangaservice.entity.Genre.mangas: could not initialize proxy - no Session
at shadowshift.studio.mangaservice.entity.Manga.addGenre(Manga.java:606)

org.hibernate.LazyInitializationException: failed to lazily initialize a collection of role: 
shadowshift.studio.mangaservice.entity.Tag.mangas: could not initialize proxy - no Session
at shadowshift.studio.mangaservice.entity.Manga.addTag(Manga.java:647)
```

**Причина:**
В методах `Manga.addGenre()` и `Manga.addTag()` происходило обращение к ленивым коллекциям:
- `genre.getMangas().add(this)`
- `tag.getMangas().add(this)`

Коллекции `Genre.mangas` и `Tag.mangas` помечены как `@ManyToMany(fetch = FetchType.LAZY)` 
и загружаются только внутри активной Hibernate-сессии.

Когда `createMangaFromData()` вызывается из асинхронного метода `importMangaWithProgressAsync()`, 
Hibernate-сессия уже закрыта, и попытка загрузить ленивую коллекцию вызывает `LazyInitializationException`.

**Решение:**
Убрали обращение к ленивым коллекциям из методов `addGenre()`, `removeGenre()`, `addTag()`, `removeTag()`:

```java
// ДО (вызывало LazyInitializationException):
public void addGenre(Genre genre) {
    this.genres.add(genre);
    genre.getMangas().add(this);  // ← Обращение к LAZY-коллекции!
    genre.incrementMangaCount();
}

public void addTag(Tag tag) {
    this.tags.add(tag);
    tag.getMangas().add(this);  // ← Обращение к LAZY-коллекции!
    tag.incrementMangaCount();
    tag.incrementPopularity();
}

// ПОСЛЕ (безопасно):
public void addGenre(Genre genre) {
    this.genres.add(genre);
    // НЕ обращаемся к genre.getMangas() — это вызовет LazyInitializationException
    genre.incrementMangaCount();
}

public void addTag(Tag tag) {
    this.tags.add(tag);
    // НЕ обращаемся к tag.getMangas() — это вызовет LazyInitializationException
    tag.incrementMangaCount();
    tag.incrementPopularity();
}
```

Hibernate сам управляет двунаправленной связью `@ManyToMany` при сохранении сущностей.
Нам достаточно добавить жанр/тег в коллекцию `manga.genres`/`manga.tags`, и Hibernate автоматически 
обновит связующую таблицу `manga_genres`/`manga_tags` при следующем `save()`.

### 1a. Detached entity passed to persist

**Ошибка:**
```
org.springframework.dao.InvalidDataAccessApiUsageException: detached entity passed to persist: shadowshift.studio.mangaservice.entity.Genre
at shadowshift.studio.mangaservice.service.MelonIntegrationService.createMangaFromData(MelonIntegrationService.java:1109)
```

**Причина:**
Связь `@ManyToMany` для жанров и тегов была настроена с каскадом `CascadeType.PERSIST`:
```java
@ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
```

Когда `mangaRepository.save(manga)` вызывается, Hibernate пытается **persist** все связанные жанры/теги.
Но эти жанры/теги уже существуют в БД (были получены через `genreService.createOrGetGenre()`), 
поэтому они находятся в состоянии **detached** (отсоединены от текущей сессии).

Hibernate не может persist detached entity → ошибка.

**Решение:**
Убрали каскадирование `CascadeType.PERSIST` и `CascadeType.MERGE` из связи `@ManyToMany`:

```java
// ДО (вызывало detached entity error):
@ManyToMany(fetch = FetchType.LAZY, cascade = {CascadeType.PERSIST, CascadeType.MERGE})
@JoinTable(
    name = "manga_genres",
    joinColumns = @JoinColumn(name = "manga_id"),
    inverseJoinColumns = @JoinColumn(name = "genre_id")
)
private Set<Genre> genres = new HashSet<>();

// ПОСЛЕ (безопасно):
@ManyToMany(fetch = FetchType.LAZY)
@JoinTable(
    name = "manga_genres",
    joinColumns = @JoinColumn(name = "manga_id"),
    inverseJoinColumns = @JoinColumn(name = "genre_id")
)
private Set<Genre> genres = new HashSet<>();
```

Жанры и теги — это **независимые справочники**, которые управляются отдельно через `GenreService` и `TagService`.
Они уже существуют в БД до создания манги, поэтому не должны каскадироваться при сохранении манги.

При сохранении манги Hibernate просто создаст записи в связующей таблице `manga_genres`/`manga_tags` 
без попыток сохранить сами жанры/теги.

### 2. Дублирующий импорт и очистка данных

**Ошибка:**
```
500 Internal Server Error: "{"detail":"404: Манга 'another' не найдена"}"
at shadowshift.studio.mangaservice.service.MelonIntegrationService.importToSystemAsync
```

**Последовательность событий:**
1. `AutoParsingService.processAutoParsingAsync()` запускает `startFullParsing(slug)`
2. `MelonIntegrationService.runFullParsingTaskLogic()` выполняет:
   - Парсинг JSON (0-50%)
   - Билд архива с изображениями (50-70%)
   - **Импорт в БД** (70-95%)
   - **Очистку данных из MelonService** (95-100%)
3. Первый импорт завершился с ошибкой `LazyInitializationException`, **НО очистка всё равно произошла** (данные удалены)
4. `AutoParsingService` ожидает завершения `waitForFullParsingCompletion()`
5. После завершения `AutoParsingService` **повторно** вызывает `importToSystemAsync(slug, null)`
6. Второй импорт пытается получить данные из MelonService, но получает **404** — данные уже удалены!

**Причина:**
Дублирующий вызов импорта в `AutoParsingService`.

`runFullParsingTaskLogic()` уже выполняет ПОЛНЫЙ цикл:
- ✅ Парсинг JSON
- ✅ Скачивание и упаковка изображений
- ✅ **Импорт в БД**
- ✅ **Очистка данных из MelonService**

Но `AutoParsingService` не знал об этом и после `waitForFullParsingCompletion()` 
**снова** пытался импортировать и очищать данные.

**Решение:**
Убрали дублирующий вызов импорта и очистки из `AutoParsingService`:

```java
// ДО (дублирующий импорт):
boolean completed = waitForFullParsingCompletion(fullParsingTaskId);
if (completed) {
    // Повторный импорт ← Данные уже импортированы!
    Map<String, Object> importResult = melonService.importToSystemAsync(slug, null);
    // ... ожидание импорта ...
    // Повторная очистка ← Данные уже удалены!
    melonService.deleteManga(slug);
}

// ПОСЛЕ (без дублирования):
boolean completed = waitForFullParsingCompletion(fullParsingTaskId);
if (completed) {
    // runFullParsingTaskLogic() уже всё сделал!
    task.importedSlugs.add(slug);
    logger.info("Манга '{}' успешно обработана через полный парсинг", slug);
}
```

## Файлы изменены

### 1. `Manga.java`
**Методы:** `addGenre()`, `removeGenre()`, `addTag()`, `removeTag()`

**Изменения в методах:**
- Убрали обращение к `genre.getMangas()` — ленивой коллекции
- Убрали обращение к `tag.getMangas()` — ленивой коллекции
- Добавили комментарии о причине изменения
- Hibernate сам управляет двунаправленной связью при сохранении

**Изменения в полях:**
- Убрали `cascade = {CascadeType.PERSIST, CascadeType.MERGE}` из `@ManyToMany` для `genres`
- Убрали `cascade = {CascadeType.PERSIST, CascadeType.MERGE}` из `@ManyToMany` для `tags`
- Жанры и теги — независимые справочники, управляются отдельно через свои сервисы

### 2. `AutoParsingService.java`
**Метод:** `processAutoParsingAsync()`

**Изменения:**
- Убрали повторный вызов `importToSystemAsync()` после `waitForFullParsingCompletion()`
- Убрали повторный вызов `deleteManga()` после импорта
- Убрали ожидание `waitForImportCompletion()` (теперь не используется)
- Добавили пояснение, что `runFullParsingTaskLogic()` уже делает импорт и очистку

## Ожидаемый результат

### До исправления:
1. ❌ `LazyInitializationException` при добавлении жанров/тегов к манге
2. ❌ `detached entity passed to persist` при сохранении манги с жанрами/тегами
3. ❌ Данные удалялись из MelonService даже при ошибке импорта
4. ❌ Повторный импорт получал 404, так как данные уже удалены
5. ❌ Workflow не завершался успешно

### После исправления:
1. ✅ Жанры и теги добавляются без обращения к ленивым коллекциям
2. ✅ Нет каскадирования PERSIST для жанров/тегов (они управляются отдельно)
3. ✅ Импорт проходит без `LazyInitializationException` и `detached entity` ошибок
4. ✅ Нет дублирующего импорта
5. ✅ Данные удаляются из MelonService только после успешного импорта
6. ✅ Полный workflow: Парсинг (50%) → Билд (70%) → Импорт (95%) → Очистка (100%)

## Проверка исправлений

После пересборки MangaService проверьте:

```bash
# Запустить автопарсинг с limit=1
curl -X POST http://localhost:8083/api/manga/auto-parse?limit=1

# Проверить логи MangaService
docker-compose logs -f manga-service
```

**Ожидаемые логи:**
```
INFO: Шаг 4: Импорт глав и страниц...
INFO: ✓ Все главы импортированы успешно
INFO: === ИМПОРТ ЗАВЕРШЕН УСПЕШНО ===
INFO: Импорт завершен для slug=xxx, очищаем данные из MelonService
INFO: Данные успешно удалены из MelonService для slug=xxx
INFO: Полный парсинг завершен успешно! JSON, изображения импортированы, данные очищены.
INFO: Манга 'xxx' успешно обработана через полный парсинг
```

**НЕ должно быть:**
```
ERROR: LazyInitializationException: failed to lazily initialize a collection
ERROR: detached entity passed to persist: shadowshift.studio.mangaservice.entity.Genre
ERROR: detached entity passed to persist: shadowshift.studio.mangaservice.entity.Tag
ERROR: 500 Internal Server Error: "404: Манга 'xxx' не найдена"
INFO: Запуск импорта для slug: xxx  ← (повторный импорт)
```

## Связанные документы
- `FIX_IMPORT_AND_CLEANUP.md` — исправление workflow импорта и очистки
- `FIX_BUILD_REQUEST_PARAMETERS.md` — исправление параметров BuildRequest
- `FIX_IMPORT_NULLPOINTER.md` — исправление NullPointerException при импорте
- `FIX_MELON_BAD_IMAGE_STUB.md` — исправление IsADirectoryError в парсере
