# Проверка дубликатов манги в системе

## Обзор

Система предотвращает создание дубликатов манги с помощью проверки уникального идентификатора `melonSlug`.

## Как это работает

### Уникальное поле `melonSlug`

В сущности `Manga` поле `melonSlug` имеет ограничение уникальности на уровне базы данных:

```java
@Column(name = "melon_slug", length = 255, unique = true)
private String melonSlug;
```

Это означает, что **две манги не могут иметь одинаковый `melonSlug`**.

## Методы с проверкой дубликатов

### 1. 📝 Создание манги - `createManga()`

**Когда вызывается**: При создании новой манги через API

**Что проверяет**:
- Если в запросе указан `melonSlug`, система проверяет его уникальность
- Если манга с таким `melonSlug` уже существует → выбрасывается исключение

**Пример**:
```java
if (StringUtils.hasText(createDTO.getMelonSlug())) {
    String normalizedSlug = createDTO.getMelonSlug().trim();
    if (mangaRepository.existsByMelonSlug(normalizedSlug)) {
        throw new MangaValidationException(
            "Манга с переданным Melon slug уже существует: " + normalizedSlug
        );
    }
}
```

**Результат**:
- ✅ Манга создается, если `melonSlug` уникален или не указан
- ❌ Выбрасывается `MangaValidationException`, если `melonSlug` уже занят

---

### 2. 📥 Импорт из Melon - `createMangaFromMelon()`

**Когда вызывается**: При импорте манги из внешнего сервиса MelonService

**Что проверяет**:
- Обязательная проверка `melonSlug` перед импортом
- Предотвращает повторный импорт одной и той же манги

**Логика**: Идентична методу `createManga()`

**Результат**:
- ✅ Манга импортируется, если это новая манга
- ❌ Импорт отклоняется, если манга уже была импортирована ранее

---

### 3. ✏️ Обновление манги - `updateManga()`

**Когда вызывается**: При редактировании существующей манги

**Что проверяет**:
- Если `melonSlug` **изменился**, проверяет уникальность нового значения
- Если `melonSlug` **не изменился**, проверка не выполняется

**Пример**:
```java
if (StringUtils.hasText(updateDTO.getMelonSlug())) {
    String normalizedSlug = updateDTO.getMelonSlug().trim();
    String currentSlug = existingManga.getMelonSlug();
    
    // Проверяем только если slug изменился
    if (!normalizedSlug.equals(currentSlug)
            && mangaRepository.existsByMelonSlug(normalizedSlug)) {
        throw new MangaValidationException(
            "Манга с переданным Melon slug уже существует: " + normalizedSlug
        );
    }
}
```

**Результат**:
- ✅ Обновление проходит, если новый `melonSlug` уникален
- ✅ Обновление проходит, если `melonSlug` не изменился
- ❌ Выбрасывается исключение, если новый `melonSlug` уже занят другой мангой

---

## Сценарии использования

### ✅ Успешные операции

1. **Создание манги без melonSlug**
   ```json
   {
     "title": "Новая манга",
     "description": "Описание"
   }
   ```
   → Манга создается без проблем

2. **Создание манги с уникальным melonSlug**
   ```json
   {
     "title": "Новая манга",
     "melonSlug": "unique-manga-123"
   }
   ```
   → Манга создается, если `unique-manga-123` еще не занят

3. **Обновление манги без изменения melonSlug**
   ```json
   {
     "title": "Обновленное название",
     "melonSlug": "existing-slug"  // Тот же slug, что был
   }
   ```
   → Обновление проходит успешно

### ❌ Отклоненные операции

1. **Попытка создать дубликат по melonSlug**
   ```json
   {
     "title": "Дубликат манги",
     "melonSlug": "existing-manga-slug"  // Уже существует!
   }
   ```
   → Ошибка: `MangaValidationException: Манга с переданным Melon slug уже существует: existing-manga-slug`

2. **Попытка изменить melonSlug на уже занятый**
   ```json
   {
     "id": 1,
     "melonSlug": "another-manga-slug"  // Этот slug занят мангой с ID=2
   }
   ```
   → Ошибка: `MangaValidationException: Манга с переданным Melon slug уже существует: another-manga-slug`

---

## Двойная защита

Система использует **два уровня защиты** от дубликатов:

1. **Программная проверка** (Application Level)
   - Выполняется в методах сервиса перед сохранением
   - Возвращает понятное сообщение об ошибке
   - Позволяет логировать попытки создания дубликатов

2. **Ограничение БД** (Database Level)
   - `unique = true` на столбце `melon_slug`
   - Гарантирует уникальность даже при обходе программной проверки
   - Последняя линия защиты

---

## Репозиторий - метод проверки

В `MangaRepository` определен метод для проверки существования:

```java
boolean existsByMelonSlug(String melonSlug);
```

Этот метод автоматически генерируется Spring Data JPA и выполняет запрос:
```sql
SELECT COUNT(*) > 0 FROM manga WHERE melon_slug = ?
```

---

## Рекомендации

1. **При импорте из внешних источников**: Всегда указывайте `melonSlug`
2. **При ручном создании манги**: `melonSlug` опционален
3. **При обновлении**: Не меняйте `melonSlug` без необходимости
4. **Обработка ошибок**: Ловите `MangaValidationException` в контроллерах

---

## Исправления (октябрь 2025)

### Проблема
После исправления ошибок компиляции метод `createManga` потерял проверку на дубликаты.

### Решение
Добавлена проверка существования манги по `melonSlug` в метод `createManga`:
- ✅ Проверка восстановлена
- ✅ Используется тот же подход, что и в `createMangaFromMelon`
- ✅ Система снова защищена от дубликатов

### Файлы изменены
- `MangaService.java` - добавлена проверка в `createManga()`
- `MANGA_SERVICE_BUILD_FIX.md` - обновлена документация
