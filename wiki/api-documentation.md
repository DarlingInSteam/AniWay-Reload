# API Documentation

Полная документация API для проекта AniWay - платформы для чтения манги.

## Архитектура

- **Gateway Service** (8080) - API Gateway, единая точка входа
- **Auth Service** (8081) - Аутентификация, пользователи, закладки, отзывы, прогресс
- **Manga Service** (8082) - Управление мангой и метаданными
- **Chapter Service** (8083) - Управление главами манги
- **Image Storage Service** (8084) - Хранение и обработка изображений
- **Melon Service** (8085) - Парсинг контента (Python FastAPI)

---

## Auth Service (8081)

### Аутентификация

**POST /api/auth/register**
```json
// Request
{
  "username": "testuser",
  "email": "test@example.com", 
  "password": "password123"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "role": "USER",
    "registrationDate": "2025-09-03T10:00:00"
  }
}
```

**POST /api/auth/login**
```json
// Request
{
  "username": "testuser",
  "password": "password123"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "role": "USER"
  }
}
```

**GET /api/auth/me**
- Требует: Bearer Token
- Возвращает: UserDTO текущего пользователя

**POST /api/auth/logout**
- Возвращает: 200 OK (logout на клиенте)

### Управление пользователями

**GET /api/auth/users/search**
- Параметры:
  - `query` (optional) - поисковый запрос
  - `role` (optional) - фильтр по роли
  - `page` (default: 0) - номер страницы
  - `limit` (default: 10) - размер страницы
  - `sortBy` (default: "username") - поле сортировки
  - `sortOrder` (default: "asc") - направление сортировки

```json
// Response
{
  "users": [
    {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com",
      "role": "USER",
      "registrationDate": "2025-09-03T10:00:00"
    }
  ],
  "total": 25,
  "page": 0,
  "totalPages": 3
}
```

**GET /api/auth/users/{userId}/public**
- Публичный профиль пользователя (без email)

**GET /api/auth/users/{userId}**
- Требует: Bearer Token
- Полный профиль (только для владельца или админа)

### Закладки

**POST /api/bookmarks**
```json
// Request
{
  "mangaId": 1,
  "status": "READING", // READING, COMPLETED, DROPPED, PLAN_TO_READ
  "isFavorite": true
}

// Response
{
  "id": 1,
  "userId": 1,
  "mangaId": 1,
  "status": "READING",
  "isFavorite": true,
  "mangaTitle": "One Piece",
  "mangaCoverUrl": "https://example.com/cover.jpg",
  "currentChapter": 5,
  "totalChapters": 100,
  "createdAt": "2025-09-03T10:00:00"
}
```

**GET /api/bookmarks**
- Требует: Bearer Token
- Возвращает: List<BookmarkDTO> пользователя

**GET /api/bookmarks/status/{status}**
- Фильтр закладок по статусу

**GET /api/bookmarks/favorites**
- Избранные закладки пользователя

**GET /api/bookmarks/manga/{mangaId}**
- Закладка пользователя для конкретной манги

**GET /api/bookmarks/user/{username}**
- Публичные закладки пользователя

**DELETE /api/bookmarks/{mangaId}**
- Удаление закладки

### Отзывы и рейтинги

**POST /api/auth/reviews/manga/{mangaId}**
```json
// Request
{
  "rating": 8, // 1-10
  "comment": "Отличная манга!"
}

// Response
{
  "id": 1,
  "userId": 1,
  "mangaId": 1,
  "rating": 8,
  "comment": "Отличная манга!",
  "username": "testuser",
  "createdAt": "2025-09-03T10:00:00",
  "trustFactor": 1.0
}
```

**GET /api/auth/reviews/manga/{mangaId}**
- Все отзывы для манги
- Параметры: `page`, `size`, `sortBy`, `sortOrder`

**GET /api/auth/reviews/manga/{mangaId}/rating**
- Средний рейтинг манги
```json
{
  "averageRating": 8.5,
  "totalReviews": 150,
  "ratingDistribution": {
    "1": 2, "2": 1, "3": 5, "4": 8, 
    "5": 12, "6": 18, "7": 25, "8": 35, 
    "9": 28, "10": 16
  }
}
```

**PUT /api/auth/reviews/{reviewId}**
- Обновление отзыва

**DELETE /api/auth/reviews/{reviewId}**
- Удаление отзыва

**POST /api/auth/reviews/{reviewId}/like**
- Лайк/дизлайк отзыва
```json
// Request
{
  "isLike": true // true для лайка, false для дизлайка
}
```

### Прогресс чтения

**POST /api/auth/progress**
```json
// Request
{
  "mangaId": 1,
  "chapterNumber": 1050,
  "pageNumber": 15,
  "isCompleted": false
}
```

**GET /api/auth/progress**
- Весь прогресс пользователя

**GET /api/auth/progress/manga/{mangaId}**
- Прогресс по конкретной манге

**GET /api/auth/progress/stats**
- Статистика чтения
```json
{
  "totalChaptersRead": 250,
  "mangasStarted": 15,
  "completedManga": 3,
  "readingStreak": 7
}
```

---

## Manga Service (8082)

### Управление мангой

**GET /api/manga**
- Параметры: `page`, `size`, `sort`
- Возвращает: Page<MangaDTO>

**GET /api/manga/search**
- Параметры: 
  - `title` - поиск по названию
  - `author` - поиск по автору
  - `genre` - фильтр по жанру
  - `status` - фильтр по статусу
  - `page`, `size`, `sort`

**GET /api/manga/{id}**
```json
// Response
{
  "id": 1,
  "title": "One Piece",
  "description": "История о пирате...",
  "author": "Eiichiro Oda",
  "artist": "Eiichiro Oda",
  "genres": ["Adventure", "Comedy", "Shounen"],
  "status": "ONGOING",
  "coverImageUrl": "https://example.com/cover.jpg",
  "totalChapters": 1095,
  "rating": 9.2,
  "createdAt": "2023-01-01T00:00:00",
  "updatedAt": "2025-09-03T10:00:00"
}
```

**POST /api/manga**
- Требует: ADMIN роль
- Создание новой манги

**PUT /api/manga/{id}**
- Требует: ADMIN роль
- Обновление манги

**DELETE /api/manga/{id}**
- Требует: ADMIN роль
- Удаление манги

**GET /api/manga/{id}/chapters**
- Список глав манги

---

## Chapter Service (8083)

### Управление главами

**GET /api/chapters**
- Все главы с пагинацией

**GET /api/chapters/{id}**
```json
// Response
{
  "id": 1,
  "mangaId": 1,
  "chapterNumber": 1050,
  "title": "Глава 1050: Новая эра",
  "publishedDate": "2025-09-03",
  "pageCount": 17,
  "createdAt": "2025-09-03T10:00:00"
}
```

**GET /api/chapters/manga/{mangaId}**
- Главы конкретной манги

**GET /api/chapters/manga/{mangaId}/count**
- Количество глав для манги

**POST /api/chapters**
```json
// Request
{
  "mangaId": 1,
  "chapterNumber": 1051,
  "title": "Новая глава",
  "publishedDate": "2025-09-03"
}
```

**PUT /api/chapters/{id}**
- Обновление главы

**DELETE /api/chapters/{id}**
- Удаление главы

---

## Image Storage Service (8084)

### Управление изображениями

**POST /api/images/upload/{chapterId}**
- Content-Type: multipart/form-data
- Параметры:
  - `images` - массив файлов изображений
  - `startPage` (optional) - начальная страница

```json
// Response
[
  {
    "id": 1,
    "chapterId": 1,
    "pageNumber": 1,
    "imageKey": "chapter_1_page_1_uuid.jpg",
    "originalFileName": "page01.jpg",
    "contentType": "image/jpeg",
    "fileSize": 524288,
    "uploadedAt": "2025-09-03T10:00:00"
  }
]
```

**GET /api/images/chapter/{chapterId}**
- Все изображения главы

**GET /api/images/chapter/{chapterId}/preview**
- Превью изображений (первые 6)

**GET /api/images/{id}**
- Информация об изображении

**GET /api/images/proxy/{imageKey}**
- Получение изображения через прокси
- Response: binary image data
- Headers: Cache-Control, Content-Type

**DELETE /api/images/{id}**
- Удаление изображения

**DELETE /api/images/chapter/{chapterId}**
- Удаление всех изображений главы

**GET /api/images/storage/stats**
```json
// Response
{
  "totalImages": 15000,
  "totalSizeBytes": 2147483648,
  "totalSizeMB": 2048.0,
  "minioConnection": "OK"
}
```

---

## Melon Service (8085)

### Парсинг контента (Python FastAPI)

**POST /parse**
```json
// Request
{
  "slug": "one-piece",
  "parser": "newtoki"
}

// Response
{
  "task_id": "uuid-task-id",
  "status": "started",
  "message": "Parsing started"
}
```

**POST /build**
```json
// Request
{
  "slug": "one-piece", 
  "parser": "newtoki",
  "type": "simple"
}
```

**GET /status/{task_id}**
```json
// Response
{
  "task_id": "uuid-task-id",
  "status": "completed", // started, processing, completed, failed
  "progress": 100,
  "message": "Parsing completed successfully",
  "result": {
    "chapters_parsed": 25,
    "images_downloaded": 450
  }
}
```

**POST /batch-parse**
```json
// Request
{
  "slugs": ["one-piece", "naruto", "bleach"],
  "parser": "newtoki",
  "auto_import": true
}
```

---

## Общие принципы

### Аутентификация
- Используется JWT Bearer tokens
- Заголовок: `Authorization: Bearer <token>`
- Токены не истекают автоматически (управление на клиенте)

### Пагинация
```json
{
  "content": [...],
  "totalElements": 150,
  "totalPages": 15,
  "size": 10,
  "number": 0,
  "first": true,
  "last": false
}
```

### Сортировка
- Параметр: `sort=field,direction`
- Примеры: `sort=title,asc`, `sort=createdAt,desc`

### Фильтрация
- Query параметры для фильтров
- Поддержка частичного поиска для текстовых полей
- Точное совпадение для enum значений

### Коды ответов
- **200** - Успешно
- **201** - Создано
- **204** - Успешно, нет содержимого
- **400** - Некорректный запрос
- **401** - Не авторизован
- **403** - Доступ запрещен
- **404** - Не найдено
- **500** - Внутренняя ошибка сервера

### Структура ошибки
```json
{
  "timestamp": "2025-09-03T10:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Описание ошибки",
  "path": "/api/endpoint"
}
```

### CORS
- Разрешены origins: `http://localhost:3000`, `http://192.168.0.3:3000`
- Все методы и заголовки разрешены

---

## Примеры использования

### Регистрация и вход
1. `POST /api/auth/register` - регистрация
2. `POST /api/auth/login` - получение токена
3. Использование токена в заголовке `Authorization: Bearer <token>`

### Чтение манги
1. `GET /api/manga/search?title=one` - поиск манги
2. `GET /api/manga/{id}` - детали манги
3. `GET /api/manga/{id}/chapters` - список глав
4. `GET /api/images/chapter/{chapterId}` - страницы главы

### Управление закладками
1. `POST /api/bookmarks` - добавить в закладки
2. `GET /api/bookmarks/favorites` - избранное
3. `POST /api/auth/progress` - сохранить прогресс

### Оставить отзыв
1. `POST /api/auth/reviews/manga/{mangaId}` - создать отзыв
2. `POST /api/auth/reviews/{reviewId}/like` - лайкнуть отзыв

---

## Development URLs

- **Gateway**: http://localhost:8080
- **Frontend**: http://localhost:5173
- **Auth Service**: http://localhost:8081
- **Manga Service**: http://localhost:8082
- **Chapter Service**: http://localhost:8083
- **Image Storage**: http://localhost:8084
- **Melon Service**: http://localhost:8085
