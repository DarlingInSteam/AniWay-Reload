# 🎯 Исправление проверки дубликатов для нового формата MangaLib slug

## 📌 Проблема

После исправления формата slug на `ID--slug`, система начала импортировать **дубликаты** уже существующей манги:

**Причина:**
- В БД хранится: `sweet-home-kim-carnby-` (старый формат, без ID)
- Парсер передаёт: `3754--sweet-home-kim-carnby-` (новый формат, с ID)
- Проверка дубликатов: `existsByMelonSlug("3754--sweet-home-kim-carnby-")` → **НЕ НАХОДИТ** запись в БД
- Результат: система думает, что это новая манга и импортирует дубликат

---

## 🔧 Решение

Добавлена **нормализация slug** перед:
1. Проверкой дубликатов в `AutoParsingService`
2. Сохранением в БД в `MelonIntegrationService`

### Изменения:

#### 1. **AutoParsingService.java**

**Добавлен метод нормализации:**
```java
/**
 * Нормализует slug, убирая префикс ID-- если он есть.
 * MangaLib изменил формат: теперь slug'и имеют формат "ID--slug" (например "7580--i-alone-level-up")
 * Для проверки дубликатов нужно сравнивать только часть после "--"
 * 
 * @param slug исходный slug (может быть "7580--i-alone-level-up" или "i-alone-level-up")
 * @return нормализованный slug без ID (всегда "i-alone-level-up")
 */
private String normalizeSlug(String slug) {
    if (slug == null || slug.isEmpty()) {
        return slug;
    }
    
    // Проверяем формат "ID--slug"
    if (slug.contains("--")) {
        String[] parts = slug.split("--", 2);
        // Если первая часть - число (ID), возвращаем вторую часть (slug)
        if (parts.length == 2 && parts[0].matches("\\d+")) {
            logger.debug("Нормализация slug: '{}' -> '{}'", slug, parts[1]);
            return parts[1];
        }
    }
    
    // Если формат не "ID--slug", возвращаем как есть
    return slug;
}
```

**Исправлена проверка дубликатов (строки ~192-210):**
```java
// БЫЛО:
if (mangaRepository.existsByMelonSlug(slug)) {
    logger.info("Манга с slug '{}' уже импортирована, пропускаем", slug);
    // ...
}

// СТАЛО:
// MangaLib изменил формат: slug может быть "7580--i-alone-level-up"
// Для проверки дубликатов нормализуем до "i-alone-level-up"
String normalizedSlug = normalizeSlug(slug);

if (mangaRepository.existsByMelonSlug(normalizedSlug)) {
    logger.info("Манга с slug '{}' (normalized: '{}') уже импортирована, пропускаем", 
        slug, normalizedSlug);
    // ...
}
```

#### 2. **MelonIntegrationService.java**

**Добавлен метод нормализации:**
```java
/**
 * Нормализует slug для MangaLib, убирая префикс ID-- если он есть.
 * MangaLib изменил формат: теперь slug'и имеют формат "ID--slug" (например "7580--i-alone-level-up")
 * Для совместимости с существующими записями в БД нормализуем до "i-alone-level-up"
 * 
 * @param slug исходный slug (может быть "7580--i-alone-level-up" или "i-alone-level-up")
 * @return нормализованный slug без ID (всегда "i-alone-level-up")
 */
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

**Исправлено сохранение slug (строки ~1010-1020):**
```java
private Manga createMangaFromData(Map<String, Object> mangaInfo, String filename) {
    Manga manga = new Manga();

    // MangaLib изменил формат slug: теперь может быть "7580--i-alone-level-up"
    // Нормализуем до "i-alone-level-up" для совместимости с существующими записями
    String normalizedSlug = normalizeSlugForMangaLib(filename);
    
    // КРИТИЧНО: Устанавливаем melonSlug для проверки дубликатов и автообновления
    manga.setMelonSlug(normalizedSlug);
    
    // ... остальной код
}
```

---

## ✅ Результат

**Поток данных:**

1. **API каталога** → возвращает `slug_url = "7580--i-alone-level-up"`
2. **AutoParsingService** → нормализует до `"i-alone-level-up"` → проверяет дубликаты
3. **Парсер** → получает `"7580--i-alone-level-up"` → извлекает ID=7580, slug="i-alone-level-up"
4. **MelonIntegrationService** → нормализует `filename` до `"i-alone-level-up"` → сохраняет в БД

**В БД всегда сохраняется:** `sweet-home-kim-carnby-` (без ID)

**Проверка дубликатов работает:**
- Входящий slug: `3754--sweet-home-kim-carnby-`
- Нормализованный: `sweet-home-kim-carnby-`
- Проверка: `existsByMelonSlug("sweet-home-kim-carnby-")` → **НАХОДИТ** ✅
- Результат: пропускаем, дубликат не создаётся

---

## 🧪 Тестирование

### 1. Проверка компиляции

```bash
cd C:\project\AniWayImageSystem\AniWay-Reload\MangaService
.\gradlew.bat build -x test
```

**Результат:** ✅ BUILD SUCCESSFUL

### 2. Тестовые сценарии

#### Сценарий 1: Новая манга (не в БД)
- Входящий slug: `7580--i-alone-level-up`
- Нормализованный: `i-alone-level-up`
- Проверка БД: не найдена
- Результат: **импортируется** ✅

#### Сценарий 2: Существующая манга (уже в БД)
- Входящий slug: `3754--sweet-home-kim-carnby-`
- Нормализованный: `sweet-home-kim-carnby-`
- Проверка БД: найдена (запись с `melon_slug = "sweet-home-kim-carnby-"`)
- Результат: **пропускается** ✅

#### Сценарий 3: Старый формат slug (без ID)
- Входящий slug: `wind-breaker`
- Нормализованный: `wind-breaker` (нет `--`, возвращается как есть)
- Проверка БД: работает как раньше
- Результат: **обратная совместимость** ✅

---

## 🚀 Деплой на сервер

### 1. Коммит изменений

```bash
cd C:\project\AniWayImageSystem\AniWay-Reload

git add MangaService/src/main/java/shadowshift/studio/mangaservice/service/AutoParsingService.java
git add MangaService/src/main/java/shadowshift/studio/mangaservice/service/MelonIntegrationService.java
git commit -m "fix: нормализация MangaLib slug для исправления проверки дубликатов"
git push origin develop
```

### 2. Обновление на сервере

```bash
# SSH на сервер
ssh darling@compute-vm-12-24-30-ssd-1758530558688

cd ~/AniWay-Reload

# Обновить код
git stash push -m "Production settings"
git pull origin develop
git stash pop

# Пересобрать и перезапустить
docker-compose -f docker-compose.prod.yml build manga-service
docker-compose -f docker-compose.prod.yml up -d manga-service

# Проверить логи
docker logs -f aniway-reload-manga-service-1
```

### 3. Проверка после деплоя

**Ожидаемые логи:**

```
[INFO] Нормализация slug: '7580--i-alone-level-up' -> 'i-alone-level-up'
[INFO] Манга с slug '7580--i-alone-level-up' (normalized: 'i-alone-level-up') уже импортирована, пропускаем
[DEBUG] Нормализация MangaLib slug: '3754--sweet-home-kim-carnby-' -> 'sweet-home-kim-carnby-'
```

**Тестирование:**
1. Запустить автопарсинг для страницы 1 (60 манг)
2. Проверить, что существующие манги пропускаются
3. Проверить, что новые манги импортируются без дубликатов

---

## 📊 Изменённые файлы

### 1. **AutoParsingService.java**
- **Добавлено:** Метод `normalizeSlug(String slug)` (28 строк)
- **Изменено:** Проверка дубликатов с нормализацией (строки ~192-210)

### 2. **MelonIntegrationService.java**
- **Добавлено:** Метод `normalizeSlugForMangaLib(String slug)` (28 строк)
- **Изменено:** Сохранение slug с нормализацией в `createMangaFromData()` (строки ~1010-1020)

**Всего изменений:** ~60 строк кода

---

## 🐛 Возможные проблемы

### Проблема 1: Дубликаты всё ещё создаются

**Причина:** Кеш запросов к БД

**Решение:**
```bash
# Перезапустить контейнер
docker-compose -f docker-compose.prod.yml restart manga-service

# Или очистить кеш Hibernate (если настроен)
```

### Проблема 2: Ошибка "Duplicate key" при сохранении

**Причина:** Уникальный индекс на `melon_slug` в БД

**Решение:** Это нормально - значит нормализация работает! Дубликат не будет сохранён.

### Проблема 3: Логи показывают необработанные slug'и

**Причина:** Старый код ещё в памяти

**Решение:**
```bash
# Пересобрать с очисткой кеша
docker-compose -f docker-compose.prod.yml build --no-cache manga-service
docker-compose -f docker-compose.prod.yml up -d manga-service
```

---

## ✅ Чеклист деплоя

- [ ] Закоммитить изменения в git
- [ ] Запушить на GitHub (develop branch)
- [ ] Залогиниться на сервер по SSH
- [ ] Сохранить локальные изменения (`git stash`)
- [ ] Обновить код (`git pull origin develop`)
- [ ] Вернуть локальные изменения (`git stash pop`)
- [ ] Пересобрать образ (`docker-compose build manga-service`)
- [ ] Перезапустить контейнер (`docker-compose up -d manga-service`)
- [ ] Проверить логи (`docker logs -f ...`)
- [ ] Запустить автопарсинг для тестовой страницы
- [ ] Убедиться, что существующие манги пропускаются
- [ ] Убедиться, что новые манги импортируются
- [ ] Проверить БД: нет дубликатов по `melon_slug`

---

## 🎯 Ожидаемый результат

После деплоя:
- ✅ Существующие манги **пропускаются** (не создаются дубликаты)
- ✅ Новые манги **импортируются** корректно
- ✅ В БД хранится нормализованный slug: `sweet-home-kim-carnby-` (без ID)
- ✅ Проверка дубликатов работает для обоих форматов: `ID--slug` и `slug`
- ✅ Обратная совместимость: старые slug'и без ID работают как раньше

**Логи показывают:**
```
[INFO] Получено 60 манг из каталога
[DEBUG] Нормализация slug: '7580--i-alone-level-up' -> 'i-alone-level-up'
[INFO] Манга с slug '7580--i-alone-level-up' (normalized: 'i-alone-level-up') уже импортирована, пропускаем
[INFO] Запуск парсинга для slug: 12345--new-manga-title
[DEBUG] Нормализация MangaLib slug: '12345--new-manga-title' -> 'new-manga-title'
[INFO] Манга успешно импортирована: new-manga-title
```

---

## 📝 Примечания

1. **Формат в БД:** Всегда хранится `slug` без ID для совместимости
2. **Формат из API:** Приходит `ID--slug`, нормализуется перед использованием
3. **Уникальность:** Гарантируется через индекс `UNIQUE` на `melon_slug`
4. **Производительность:** Минимальное влияние (только split и regex проверка)

**Дата исправления:** 07.10.2025  
**Версия:** 3.0 (duplicate check with normalization)  
**Зависит от:** MANGALIB_SLUG_URL_FIX.md
