# Реализация системы автопарсинга и автообновления манги

## Обзор изменений

Реализована полная система автоматического парсинга и обновления манги с проверкой на дубликаты.

---

## 📋 Созданные компоненты

### Backend (MangaService)

#### 1. **AutoParsingService.java**
**Путь:** `MangaService/src/main/java/shadowshift/studio/mangaservice/service/AutoParsingService.java`

**Функционал:**
- Автоматический парсинг списка манги по slug'ам
- Проверка на дубликаты по `melonSlug` (пропуск уже импортированных манг)
- Последовательность: Парсинг → Билдинг → Импорт → Удаление из Melon
- Асинхронная обработка с отслеживанием прогресса
- Отчеты: импортировано, пропущено, ошибок

**Основные методы:**
- `startAutoParsing(List<String> slugs, Integer page)` - запуск автопарсинга
- `getAutoParseTaskStatus(String taskId)` - получение статуса задачи

---

#### 2. **MangaUpdateService.java**
**Путь:** `MangaService/src/main/java/shadowshift/studio/mangaservice/service/MangaUpdateService.java`

**Функционал:**
- Автоматическое обновление всех манг в системе
- Получение списка манг с `melonSlug`
- Проверка новых глав через Melon API
- Парсинг только новых глав
- Проверка дубликатов глав по `chapterNumber`
- Импорт новых глав → Удаление из Melon

**Основные методы:**
- `startAutoUpdate()` - запуск автообновления всех манг
- `getUpdateTaskStatus(String taskId)` - получение статуса задачи

---

#### 3. **ParserController.java** (обновлен)
**Путь:** `MangaService/src/main/java/shadowshift/studio/mangaservice/controller/ParserController.java`

**Новые endpoints:**
- `POST /parser/auto-parse` - запуск автопарсинга
- `GET /parser/auto-parse/status/{taskId}` - статус автопарсинга
- `POST /parser/auto-update` - запуск автообновления
- `GET /parser/auto-update/status/{taskId}` - статус автообновления

---

#### 4. **MangaRepository.java** (обновлен)
**Путь:** `MangaService/src/main/java/shadowshift/studio/mangaservice/repository/MangaRepository.java`

**Новые методы:**
- `existsByMelonSlug(String melonSlug)` - проверка существования манги по slug

---

### Backend (ChapterService)

#### 5. **ChapterRestController.java** (обновлен)
**Путь:** `ChapterService/src/main/java/shadowshift/studio/chapterservice/controller/ChapterRestController.java`

**Новые endpoints:**
- `GET /api/chapters/exists?mangaId={id}&chapterNumber={num}` - проверка существования главы

---

#### 6. **ChapterService.java** (обновлен)
**Путь:** `ChapterService/src/main/java/shadowshift/studio/chapterservice/service/ChapterService.java`

**Новые методы:**
- `chapterExists(Long mangaId, Double chapterNumber)` - проверка существования главы

---

### Frontend

#### 7. **MangaManagement.tsx** (новый компонент)
**Путь:** `AniWayFrontend/src/components/admin/MangaManagement.tsx`

**Функционал:**
- UI для автопарсинга: ввод списка slug'ов, запуск, отображение прогресса
- UI для автообновления: запуск обновления всех манг, отображение статистики
- Real-time обновление статусов через polling
- Отображение результатов: импортировано, пропущено, обновлено, ошибок

**Основные функции:**
- `startAutoParsing()` - запуск автопарсинга
- `startAutoUpdate()` - запуск автообновления
- `pollAutoParseStatus()` - опрос статуса парсинга
- `pollAutoUpdateStatus()` - опрос статуса обновления

---

## 🔄 Процесс работы

### Автопарсинг

```
1. Пользователь вводит список slug'ов на фронтенде
2. Frontend → POST /api/parser/auto-parse
3. AutoParsingService запускается асинхронно
4. Для каждого slug:
   a. Проверка: manga.existsByMelonSlug(slug)
   b. Если существует → пропуск
   c. Если не существует:
      - Парсинг (startFullParsing)
      - Билдинг изображений
      - Импорт в систему
      - Удаление из Melon
5. Возврат статистики: imported, skipped, failed
```

### Автообновление

```
1. Пользователь нажимает кнопку "Автообновление"
2. Frontend → POST /api/parser/auto-update
3. MangaUpdateService запускается асинхронно
4. Получение всех манг с melonSlug
5. Для каждой манги:
   a. Получение существующих глав из ChapterService
   b. Запрос к Melon: POST /check-updates
   c. Если есть новые главы:
      - Запрос парсинга: POST /parse-new-chapters
      - Импорт только новых глав
      - Проверка дубликатов по chapterNumber
      - Удаление из Melon
6. Возврат статистики: updated_mangas, new_chapters_count
```

---

## 🛡️ Проверки на дубликаты

### Манги
- **Поле:** `melonSlug` (unique в БД)
- **Проверка:** `MangaRepository.existsByMelonSlug()`
- **Действие:** Пропуск при автопарсинге

### Главы
- **Поле:** `chapterNumber` (уникальный номер: том * 1000 + номер)
- **Проверка:** `ChapterService.chapterExists(mangaId, chapterNumber)`
- **Действие:** Пропуск при импорте новых глав

---

## 📡 Требуемые изменения в MelonService

См. документ: `MELON_SERVICE_API_CHANGES.md`

Необходимо добавить 2 новых endpoint:
1. **POST /check-updates** - проверка новых глав
2. **POST /parse-new-chapters** - парсинг только новых глав

---

## 🎨 Использование на фронтенде

### Подключение компонента

```tsx
import { MangaManagement } from '@/components/admin/MangaManagement'

// В админ-панели
<MangaManagement />
```

### Пример использования

**Автопарсинг:**
1. Пользователь вводит slug'и (по одному на строку)
2. Нажимает "Запустить автопарсинг"
3. Отслеживает прогресс в реальном времени
4. Видит результаты: импортировано X, пропущено Y, ошибок Z

**Автообновление:**
1. Пользователь нажимает "Запустить автообновление"
2. Система проверяет все манги
3. Отслеживает прогресс
4. Видит результаты: обновлено X манг, добавлено Y глав

---

## ✅ Преимущества

1. **Автоматизация:** Нет необходимости вручную парсить и импортировать каждую мангу
2. **Проверка дубликатов:** Исключает повторный импорт
3. **Batch обработка:** Можно обработать сотни манг за раз
4. **Обновление глав:** Автоматическое добавление новых глав
5. **Отслеживание:** Real-time прогресс и детальная статистика
6. **Надежность:** Обработка ошибок и отчеты о проблемах

---

## 📝 Примечания

- Все сервисы работают асинхронно, не блокируя пользователя
- Логирование всех операций для отладки
- Graceful обработка ошибок
- Совместимость с существующей архитектурой
- Не ломает текущий функционал парсинга и импорта

---

## 🚀 Следующие шаги

1. Реализовать endpoints в MelonService (см. MELON_SERVICE_API_CHANGES.md)
2. Протестировать автопарсинг на небольшом списке манг
3. Протестировать автообновление
4. При необходимости добавить планировщик (scheduler) для автообновления по расписанию
5. Добавить уведомления пользователям о новых главах

---

## Контакты

Автор: ShadowShiftStudio
Дата: 2025-10-06
