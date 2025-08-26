# AniWay API Documentation

Документация по всем endpoints микросервисной архитектуры AniWay для чтения манги.

## Архитектура сервисов

- **APIGateway** (8080) - Единая точка входа
- **MangaService** (8081) - Управление мангой и метаданными
- **ChapterService** (8082) - Управление главами
- **ImageStorageService** (8083) - Хранение и прокси изображений

---

## MangaService (8081)

### REST API Endpoints

#### Управление мангой

**GET /api/manga**
- Описание: Получить список всех манг
- Параметры: Нет
- Ответ: `List<MangaResponseDTO>`
```json
[
  {
    "id": 1,
    "title": "Название манги",
    "description": "Описание",
    "author": "Автор",
    "artist": "Художник",
    "genre": "Жанры",
    "status": "ONGOING",
    "releaseDate": "2024-01-15",
    "coverImageUrl": "https://example.com/cover.jpg",
    "totalChapters": 25,
    "createdAt": "2024-01-01T00:00:00",
    "updatedAt": "2024-01-15T12:00:00"
  }
]
```

**GET /api/manga/search**
- Описание: Поиск манги по критериям
- Параметры:
  - `title` (optional) - название (частичное совпадение)
  - `author` (optional) - автор (частичное совпадение)
  - `genre` (optional) - жанр (частичное совпадение) 
  - `status` (optional) - статус (точное совпадение: ONGOING, COMPLETED, HIATUS, CANCELLED)
- Пример: `/api/manga/search?title=наруто&author=кишимото&status=COMPLETED`
- Ответ: `List<MangaResponseDTO>`

**GET /api/manga/{id}**
- Описание: Получить конкретную мангу по ID
- Параметры: `id` (Long) - идентификатор манги
- Ответ: `MangaResponseDTO` или 404

**POST /api/manga**
- Описание: Создать новую мангу
- Тело запроса: `MangaCreateDTO`
```json
{
  "title": "Новая манга",
  "description": "Описание новой манги",
  "author": "Автор",
  "artist": "Художник", 
  "genre": "Экшен, Приключения",
  "status": "ONGOING",
  "releaseDate": "2024-01-15",
  "coverImageUrl": "https://example.com/cover.jpg"
}
```
- Ответ: `MangaResponseDTO` (201 Created)

**PUT /api/manga/{id}**
- Описание: Обновить мангу
- Параметры: `id` (Long)
- Тело запроса: `MangaCreateDTO`
- Ответ: `MangaResponseDTO` или 404

**DELETE /api/manga/{id}**
- Описание: Удалить мангу
- Параметры: `id` (Long)
- Ответ: 204 No Content

**PUT /api/manga/{id}/cover**
- Описание: Обновить обложку манги
- Параметры: `id` (Long)
- Тело запроса: `String` (URL изображения)
- Ответ: 200 OK

**GET /api/manga/{id}/chapters**
- Описание: Получить главы конкретной манги
- Параметры: `id` (Long) - идентификатор манги
- Ответ: `List<ChapterDTO>`

### Web UI Endpoints (Thymeleaf)

**GET /manga**
- Описание: Каталог манги (веб-интерфейс)
- Ответ: HTML страница с каталогом

**GET /manga/create**
- Описание: Форма создания манги
- Ответ: HTML форма

**POST /manga/create**
- Описание: Обработка создания манги
- Тело: form-data с `MangaCreateDTO`
- Редирект: `/manga` или обратно с ошибками

**GET /manga/{id}**
- Описание: Детальная страница манги
- Параметры: `id` (Long)
- Ответ: HTML страница с деталями и списком глав

**GET /manga/{id}/edit**
- Описание: Форма редактирования манги
- Параметры: `id` (Long)
- Ответ: HTML форма с данными манги

**POST /manga/{id}/edit**
- Описание: Обработка редактирования манги
- Параметры: `id` (Long)
- Тело: form-data с `MangaCreateDTO`
- Редирект: `/manga/{id}` или обратно с ошибками

**POST /manga/{id}/delete**
- Описание: Удаление манги через веб-интерфейс
- Параметры: `id` (Long)
- Редирект: `/manga`

### Reader Endpoints

**GET /reader/{chapterId}**
- Описание: Веб-ридер для чтения главы
- Параметры: `chapterId` (Long)
- Ответ: HTML страница ридера

**GET /chapters/create**
- Описание: Форма создания главы
- Параметры: `mangaId` (query param)
- Ответ: HTML форма

**POST /chapters/create**
- Описание: Создание главы с загрузкой изображений
- Тело: multipart/form-data
  - `mangaId` (Long)
  - `chapterNumber` (Integer)
  - `title` (String, optional)
  - `images` (MultipartFile[])
  - `startPage` (Integer, default: 1)
- Редирект: `/manga/{mangaId}` или обратно с ошибками

**DELETE /chapters/{id}**
- Описание: Удаление главы
- Параметры: `id` (Long)
- Ответ: 200 OK или error

---

## ChapterService (8082)

### REST API Endpoints

**GET /api/chapters**
- Описание: Получить все главы
- Ответ: `List<ChapterDTO>`

**GET /api/chapters/{id}**
- Описание: Получить главу по ID
- Параметры: `id` (Long)
- Ответ: `ChapterDTO` или 404

**GET /api/chapters/manga/{mangaId}**
- Описание: Получить главы конкретной манги
- Параметры: `mangaId` (Long)
- Ответ: `List<ChapterDTO>`

**GET /api/chapters/manga/{mangaId}/count**
- Описание: Получить количество глав для манги
- Параметры: `mangaId` (Long)  
- Ответ: `Integer`

**POST /api/chapters**
- Описание: Создать новую главу
- Тело запроса: `ChapterCreateDTO`
```json
{
  "mangaId": 1,
  "chapterNumber": 1,
  "title": "Название главы",
  "publishedDate": "2024-01-15"
}
```
- Ответ: `ChapterDTO` (201 Created)

**PUT /api/chapters/{id}**
- Описание: Обновить главу
- Параметры: `id` (Long)
- Тело запроса: `ChapterCreateDTO`
- Ответ: `ChapterDTO` или 404

**DELETE /api/chapters/{id}**
- Описание: Удалить главу
- Параметры: `id` (Long)
- Ответ: 204 No Content

### DTO Структуры

**ChapterDTO:**
```json
{
  "id": 1,
  "mangaId": 1,
  "chapterNumber": 1,
  "title": "Название главы",
  "publishedDate": "2024-01-15",
  "pageCount": 20,
  "createdAt": "2024-01-15T10:00:00",
  "updatedAt": "2024-01-15T10:00:00"
}
```

---

## ImageStorageService (8083)

### REST API Endpoints

#### Управление изображениями

**POST /api/images/upload/{chapterId}**
- Описание: Загрузить изображения для главы
- Параметры: `chapterId` (Long)
- Тело запроса: `multipart/form-data`
  - `images` (MultipartFile[]) - массив изображений
  - `startPage` (Integer, optional, default: 1) - начальная страница
- Ответ: `List<ChapterImageDTO>` (201 Created)

**GET /api/images/chapter/{chapterId}**
- Описание: Получить все изображения главы
- Параметры: `chapterId` (Long)
- Ответ: `List<ChapterImageDTO>`
```json
[
  {
    "id": 1,
    "chapterId": 1,
    "pageNumber": 1,
    "imageKey": "chapter_1_page_1_uuid.jpg",
    "originalFileName": "page01.jpg",
    "contentType": "image/jpeg",
    "fileSize": 524288,
    "uploadedAt": "2024-01-15T10:30:00"
  }
]
```

**GET /api/images/chapter/{chapterId}/preview**
- Описание: Получить превью изображений главы (первые 6)
- Параметры: `chapterId` (Long)
- Ответ: `List<ChapterImageDTO>` (максимум 6 элементов)

**GET /api/images/{id}**
- Описание: Получить информацию об изображении
- Параметры: `id` (Long)
- Ответ: `ChapterImageDTO` или 404

**DELETE /api/images/{id}**
- Описание: Удалить изображение
- Параметры: `id` (Long)
- Ответ: 204 No Content

**DELETE /api/images/chapter/{chapterId}**
- Описание: Удалить все изображения главы
- Параметры: `chapterId` (Long)
- Ответ: 204 No Content

#### Прокси изображений

**GET /api/images/proxy/{imageKey}**
- Описание: Получить изображение через прокси
- Параметры: `imageKey` (String) - ключ изображения в MinIO
- Ответ: `byte[]` (image/jpeg) с заголовками кэширования
- Заголовки:
  - `Content-Type: image/jpeg`
  - `Cache-Control: public, max-age=3600`

#### Административные endpoints

**GET /api/images/storage/stats**
- Описание: Статистика хранилища
- Ответ: 
```json
{
  "totalImages": 150,
  "totalSizeBytes": 52428800,
  "totalSizeMB": 50.0,
  "minioConnection": "OK"
}
```

**GET /api/images/health**
- Описание: Проверка здоровья сервиса
- Ответ: `200 OK` или `503 Service Unavailable`

### DTO Структуры

**ChapterImageDTO:**
```json
{
  "id": 1,
  "chapterId": 1,
  "pageNumber": 1,
  "imageKey": "chapter_1_page_1_uuid.jpg",
  "originalFileName": "page01.jpg", 
  "contentType": "image/jpeg",
  "fileSize": 524288,
  "uploadedAt": "2024-01-15T10:30:00"
}
```

---

## Общие ошибки и коды ответов

### HTTP Status Codes
- **200 OK** - Успешный запрос
- **201 Created** - Ресурс создан
- **204 No Content** - Успешное удаление
- **400 Bad Request** - Некорректные данные
- **404 Not Found** - Ресурс не найден
- **500 Internal Server Error** - Серверная ошибка

### Структура ошибки
```json
{
  "timestamp": "2024-01-15T10:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Название манги не может быть пустым",
  "path": "/api/manga"
}
```

---

## Примеры использования

### Создание манги с главами
1. `POST /api/manga` - создать мангу
2. `POST /api/chapters` - создать главу
3. `POST /api/images/upload/{chapterId}` - загрузить изображения
4. `GET /reader/{chapterId}` - читать главу

### Поиск и фильтрация
- Поиск по названию: `/api/manga/search?title=наруто`
- Фильтр по статусу: `/api/manga/search?status=ONGOING`  
- Комбинированный поиск: `/api/manga/search?title=one&author=oda&status=ONGOING`

---

## Deployment URLs

### Development
- APIGateway: `http://localhost:8080`
- MangaService: `http://localhost:8081`
- ChapterService: `http://localhost:8082`
- ImageStorageService: `http://localhost:8083`

### Production (через Gateway)
- Все API: `http://your-domain.com/api/*`
- Web UI: `http://your-domain.com/manga/*`
- Reader: `http://your-domain.com/reader/*`
