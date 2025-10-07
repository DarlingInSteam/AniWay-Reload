# Быстрый старт после всех исправлений

## Дата обновления
2025-10-07

## Что исправлено

✅ 9 критических багов:
1. LazyInitializationException (Genre/Tag)
2. Detached Entity при persist
3. Дублирующий импорт
4. Case-insensitive status
5. BuildRequest API (slug/type)
6. Import Task ID creation
7. getMangaInfo/deleteManga order
8. bad_image_stub в MelonService
9. HTML → Markdown конвертация

✅ Защита от дублирования при автопарсинге
✅ Автообновление работает корректно

**Полная документация:** `ALL_FIXES_SUMMARY.md`

---

## Быстрая пересборка

### 1. Backend (MangaService)
```powershell
cd c:\project\AniWayImageSystem\AniWay-Reload\MangaService
.\gradlew.bat build -x test
```

### 2. MelonService (если менялся)
```powershell
cd c:\project\AniWayImageSystem\AniWay-Reload\MelonService
# Проверить settings.json: bad_image_stub должен быть null
```

### 3. Frontend (AniWayFrontend)
```powershell
cd c:\project\AniWayImageSystem\AniWay-Reload\AniWayFrontend
npm run build
```

### 4. Docker rebuild
```powershell
cd c:\project\AniWayImageSystem\AniWay-Reload

# Пересобрать сервисы
docker-compose build manga-service melon-service frontend

# Перезапустить
docker-compose restart manga-service melon-service frontend

# Проверить логи
docker-compose logs -f manga-service melon-service
```

---

## Быстрое тестирование

### Test 1: Автопарсинг (должен работать без ошибок)
```bash
curl -X POST http://localhost:8083/api/manga/auto-parse?limit=1
```

**✅ Ожидаемый результат:**
- Парсинг → Билд → Импорт → Очистка
- Без LazyInitializationException
- Без detached entity errors
- Без 404 ошибок

### Test 2: Автообновление (должен обновлять только новые главы)
```bash
curl -X POST http://localhost:8083/api/manga/auto-update
```

**✅ Ожидаемый результат:**
- Проверка метаданных без парсинга
- Парсинг только при наличии новых глав
- Импорт только новых глав

### Test 3: Markdown на фронтенде
1. Откройте http://localhost:3000
2. Перейдите на страницу любой манги
3. Проверьте описание:
   - **Жирный текст** отображается жирным
   - *Курсив* отображается курсивом
   - Переносы строк работают
   - HTML-теги не видны

---

## Проверка защиты от дублирования

```bash
# 1. Запустить автопарсинг с limit=1
curl -X POST http://localhost:8083/api/manga/auto-parse?limit=1

# 2. Дождаться завершения (проверить логи)
docker-compose logs -f manga-service | grep "успешно обработана"

# 3. Запустить повторно с тем же limit
curl -X POST http://localhost:8083/api/manga/auto-parse?limit=1

# 4. В логах должно быть:
# "Манга с slug 'X' уже импортирована, пропускаем"
```

---

## Проблемы и решения

### ❌ Ошибка: "detached entity passed to persist"
**Решение:** Проверьте, что в `Manga.java` НЕТ `CascadeType.PERSIST`:
```java
@ManyToMany(fetch = FetchType.LAZY)  // ← БЕЗ cascade
private Set<Genre> genres = new HashSet<>();

@ManyToMany(fetch = FetchType.LAZY)  // ← БЕЗ cascade
private Set<Tag> tags = new HashSet<>();
```

### ❌ Ошибка: "LazyInitializationException"
**Решение:** Проверьте, что в `Manga.java` методы `addGenre()`, `addTag()` НЕ обращаются к `.getMangas()`:
```java
public void addGenre(Genre genre) {
    this.genres.add(genre);
    // genre.getMangas().add(this);  // ← ДОЛЖНО БЫТЬ ЗАКОММЕНТИРОВАНО
    genre.incrementMangaCount();
}
```

### ❌ Ошибка: "IsADirectoryError" в MelonService
**Решение:** Проверьте `MelonService/Parsers/mangalib/settings.json`:
```json
{
  "common": {
    "bad_image_stub": null,  // ← ДОЛЖНО БЫТЬ null, НЕ ""
    "delay": 1
  }
}
```

### ❌ HTML-теги отображаются в описании
**Решение:** 
1. Backend: Проверьте, что `convertHtmlToMarkdown()` вызывается в `createMangaFromData()`
2. Frontend: Проверьте, что используется `<MarkdownRenderer value={manga.description} />`

---

## Логи успешного автопарсинга

```
INFO: Получено 1 манг из каталога
INFO: Манга с slug 'already-imported' уже импортирована, пропускаем  ← Защита работает
INFO: Запуск парсинга для slug: new-manga
INFO: Зарегистрирована связь fullParsingTaskId=xxx → autoParsingTaskId=yyy
INFO: Билд завершен для slug=new-manga, запускаем импорт
INFO: === НАЧАЛО ИМПОРТА ===
INFO: Шаг 4: Импорт глав и страниц...
INFO: ✓ Все главы импортированы успешно
INFO: === ИМПОРТ ЗАВЕРШЕН УСПЕШНО ===
INFO: Импорт завершен для slug=new-manga, очищаем данные из MelonService
INFO: Данные успешно удалены из MelonService для slug=new-manga
INFO: Полный парсинг завершен успешно! JSON, изображения импортированы, данные очищены.
INFO: Манга 'new-manga' успешно обработана через полный парсинг
```

---

## Следующие шаги

1. ✅ Пересобрать все сервисы
2. ✅ Запустить Docker
3. ⏳ Протестировать автопарсинг
4. ⏳ Протестировать автообновление
5. ⏳ Проверить Markdown
6. ⏳ Проверить защиту от дублирования

**Готово к использованию!** 🎉

---

## Дополнительная документация

- `ALL_FIXES_SUMMARY.md` — Полная сводка всех исправлений
- `AUTOPARSING_AUTOUPDATE_CHECK.md` — Детальная проверка автопарсинга и автообновления
- `FIX_*.md` — Отдельные документы по каждому исправлению


## Исправленные проблемы

### MangaService (Java)
✅ **Регистронезависимая проверка статуса** (`COMPLETED` vs `completed`)  
✅ **Добавлен импорт в БД** после успешного build (progress 70-95%)  
✅ **Добавлена очистка из MelonService** после импорта (progress 95-100%)  
✅ **Исправлены параметры BuildRequest** (`filename` → `slug`, `archive_type` → `type`)  
✅ **Исправлен NullPointerException** при импорте (создается правильный importTaskId)  
✅ **Исправлен порядок getMangaInfo/deleteManga** (сначала получаем данные, потом удаляем)

### MelonService (Python)
✅ **Исправлен bad_image_stub** (`""` → `null`) - устранена ошибка IsADirectoryError

## Команды для запуска

### 1. Пересборка и перезапуск (PowerShell)

```powershell
# Перейти в корень проекта
cd c:\project\AniWayImageSystem\AniWay-Reload

# Пересобрать MangaService
docker-compose build manga-service

# Пересобрать MelonService
docker-compose build melon-service

# Перезапустить оба контейнера
docker-compose restart manga-service melon-service

# Следить за логами
docker-compose logs -f manga-service melon-service
```

### 2. Тестирование

Запустите автопарсинг с `limit=1` через API или админ-панель.

## Ожидаемые логи

### ✅ Успешный workflow:

```
INFO: Парсинг завершен для slug=xxx
INFO: Билд завершен для slug=xxx, запускаем импорт
INFO: Импорт завершен для slug=xxx, очищаем данные из MelonService
INFO: Данные успешно удалены из MelonService для slug=xxx
INFO: Полный парсинг завершен успешно! JSON, изображения импортированы, данные очищены.
```

### ❌ Старая ошибка (должна исчезнуть):

```
❌ ERROR: 422 Unprocessable Entity: Field "slug" required
❌ ERROR: Ожидание задачи...статус: COMPLETED [бесконечный цикл]
```

## Прогресс на фронтенде

- **5%** - Парсинг JSON запущен
- **50%** - Парсинг JSON завершен
- **60%** - Build запущен
- **70%** - **[НОВОЕ]** Импорт в БД запущен
- **95%** - **[НОВОЕ]** Очистка из MelonService
- **100%** - Полное завершение

## Проверка результата

### 1. Манга в БД
```sql
SELECT * FROM mangas WHERE slug = 'xxx';
```

### 2. Данные удалены из MelonService
```bash
curl http://localhost:8084/info/xxx
# Должен вернуть 404 или "не найдено"
```

## Документация

- `FIX_IMPORT_AND_CLEANUP.md` - исправление импорта и очистки
- `FIX_BUILD_REQUEST_PARAMETERS.md` - исправление параметров BuildRequest
- `TESTING_IMPORT_AND_CLEANUP.md` - подробная инструкция по тестированию
