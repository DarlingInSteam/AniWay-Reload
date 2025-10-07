# Leaderboards (Топы)

Обновлённая система публичных рейтингов. Все эндпоинты публичны (GET) и кэшируются клиентом через React Query.

## Эндпоинты

| Сервис | Endpoint | Параметры | Описание |
|--------|----------|-----------|----------|
| AuthService | `/api/auth/tops/users` | `metric=readers|likes|comments|level`, `limit` | Топ пользователей по выбранной метрике |
| AuthService | `/api/auth/tops/reviews` | `days` (1..90, default 7), `limit` | Топ обзоров за период по trust factor |
| ForumService | `/api/forum/tops/threads` | `range=all|7|30`, `limit` | Топ тем форума |
| ForumService | `/api/forum/tops/posts` | `range=all|7|30`, `limit` | Топ постов форума (эндпоинт активен, вкладка временно скрыта) |
| CommentService | `/api/comments/tops` | `range=all|7|30`, `limit` | Топ комментариев |
| PostService | `/api/posts/tops` | `range=all|today|7|30`, `limit` | Топ постов на стене пользователей |

## DTO Схемы

### User (TopUserDTO)
```jsonc
{
  "id": 1,
  "username": "demo",
  "displayName": "Demo User",
  "avatar": "https://.../avatar.png",
  "chaptersReadCount": 1234,
  "likesGivenCount": 321,
  "commentsCount": 45,
  "level": 12,          // Вычисляется на бэке
  "xp": 12340           // Пропорционально главам (временная формула)
}
```

### Review (TopReviewDTO)
```jsonc
{
  "id": 10,
  "userId": 1,
  "username": "demo",
  "userDisplayName": "Demo User",
  "userAvatar": "https://.../a.png",
  "mangaId": 55,
  "rating": 8,
  "comment": "Отличная манга!",
  "likesCount": 20,
  "dislikesCount": 2,
  "likeCount": 20,        // alias (frontend совместимость)
  "dislikeCount": 2,      // alias
  "trustFactor": 18,      // likes - dislikes
  "createdAt": "2025-09-26T12:34:56"
}
```

### Forum Thread (ForumThreadTopDTO)
```jsonc
{
  "id": 100,
  "title": "Интересная тема",
  "contentExcerpt": "Первый абзац содержания...",
  "authorId": 1,
  "repliesCount": 42,
  "likesCount": 10,
  "likeCount": 10,        // alias
  "viewsCount": 900,
  "createdAt": "2025-09-26T10:00:00"
}
```

<!-- Forum Post DTO сохранён для справки, но вкладка скрыта -->
### Forum Post (ForumPostTopDTO) (скрыто в UI)
```jsonc
{
  "id": 500,
  "threadId": 100,
  "contentExcerpt": "Ответ на тему...",
  "authorId": 2,
  "likesCount": 15,
  "dislikesCount": 1,
  "likeCount": 15,
  "dislikeCount": 1,
  "trustFactor": 14,
  "createdAt": "2025-09-26T11:00:00"
}
```

### Comment (CommentTopDTO)
```jsonc
{
  "id": 9001,
  "contentExcerpt": "Комментарий...",
  "userId": 3,
  "likesCount": 12,
  "dislikesCount": 3,
  "likeCount": 12,        // alias
  "dislikeCount": 3,      // alias
  "trustFactor": 9,
  "commentType": "MANGA", // enum
  "targetId": 55,
  "createdAt": "2025-09-26T09:00:00"
}
```

## Trust Factor
`trustFactor = likes - dislikes` (минимум 0 не накладывается на бэке — фронт может отображать отрицательные значения если появятся расширения реакции).

## Обратная совместимость
Для плавного перехода добавлены alias поля `likeCount` / `dislikeCount` наряду с `likesCount` / `dislikesCount`. После обновления фронтенда и проверки можно удалить alias поля.

## Будущие улучшения
- Интеграция авторских данных (username/avatar) для тредов, постов и комментариев через batch-запрос к AuthService.
- Кэширование результатов топов (например, Caffeine на 30-60 секунд) для снижения нагрузки.
- Вычисление XP и Level вынести в отдельный сервис или Redis script при наличии сложной формулы.

# Лидерборды (Топы)

Страница `Топы` доступна по маршруту `/tops` во фронтенде и агрегирует несколько независимых рейтингов из микросервисов.

## Сводка эндпоинтов

### AuthService
- `GET /api/auth/tops/users?metric=readers|likes|comments&limit=20`
  - Возвращает список пользователей (DTO публичного пользователя) отсортированный по выбранной метрике.
  - `metric` (обяз.) – readers (кол-во прочитанных глав), likes (кол-во поставленных лайков), comments (кол-во комментариев).
  - `limit` (опц., 1..100, по умолчанию 10-20 на фронте).
- `GET /api/auth/tops/reviews?days=7&limit=20`
  - Топ обзоров по trust factor: `likeCount - dislikeCount` (secondary сортировка по likeCount).
  - `days` (опц., 1..90). Если не указан – all time.

### ForumService
- `GET /api/forum/tops/threads?range=all|7|30&limit=15`
  - Сортировка: `repliesCount DESC, likesCount DESC, viewsCount DESC`.
- (Скрыт в UI) `GET /api/forum/tops/posts?range=all|7|30&limit=15`
  - Сортировка: trust factor `(likeCount - dislikeCount) DESC`, затем `likeCount DESC`. Вкладка временно отключена.

### CommentService
- `GET /api/comments/tops?range=all|7|30&limit=15`
  - Сортировка: trust factor `(likeCount - dislikeCount) DESC`, затем `likeCount DESC`.

## Фронтенд
Файл страницы: `src/pages/TopsPage.tsx`.
Использует React Query для кэширования и обновления данных; при смене метрик / диапазонов меняется ключ запроса.

Компоненты UI (папка `src/components/tops`):
- `LeaderboardRow.tsx` – универсальная строка рейтинга.
- `LeaderboardSkeleton.tsx` – заглушка во время загрузки.
- `LeaderboardError.tsx` – вывод ошибки + кнопка повторного запроса.

API методы добавлены в `src/lib/api.ts`:
- `getTopUsers({ metric, limit })`
- `getTopReviews({ days, limit })`
- `getTopThreads({ range, limit })`
<!-- getTopPosts временно не используется на странице топов -->
- `getTopComments({ range, limit })`

## Будущие улучшения
- Добавить метрику уровня пользователя (level / XP) после стабилизации системы опыта.
- Кеширование на стороне gateway / CDN с коротким TTL (15–60 сек) для снижения нагрузки при всплесках трафика.
- Пагинация / кнопка "Показать больше" при необходимости.
- Отдельные чарт/графики динамики (line / sparkline) при наличии исторических временных рядов.
- Rate limiting на публичных эндпоинтах.

## Примечания по безопасности
Все GET эндпоинты топов открыты публично и whitelisted в `SecurityConfig` соответствующих сервисов. Данные не содержат приватных полей профиля.

---

## Дополнение: Вкладки и карточки (2025-09)

Страница топов переработана в табовый интерфейс с "полными" карточками.

### Таблицы категорий
| Таб | Endpoint | Основная сортировка | Доп. данные карточки |
|-----|----------|---------------------|-----------------------|
| Пользователи | `/api/auth/tops/users` | По выбранной метрике `metric` | Аватар, уровень, XP, чип метрики |
| Обзоры | `/api/auth/tops/reviews` | Trust (likes - dislikes) | Рейтинг, trust цвет, лайки/дизлайки, мини‑карточка манги |
| Темы форума | `/api/forum/tops/threads` | Ответы → лайки → просмотры | Автор (мини), статистика |
| (Скрыто) Посты | `/api/forum/tops/posts` | Trust factor | (Вкладка временно отключена) |
| Комментарии | `/api/comments/tops` | Trust factor | Автор (мини), тип комментария |
| Стена | `/api/posts/tops` | Score (up - down), затем up | Автор (мини), вложения (превью), Markdown, мини‑карточки манги (references) |

### Trust Factor Цвета
| Значение | Цветовая метка |
|----------|---------------|
| > 0 | Emerald (положительно) |
| 0 | Фиолетовый (нейтрально) |
| < 0 | Rose (отрицательно) |

### Энрибчмент данных на фронтенде
Для уменьшения нагрузки на бэкенд DTO упрощены, а доп. данные подтягиваются:
* `useUserMiniBatch` – пакетное получение мини-профилей (username, displayName, avatar) (TTL 5 мин.).
* `useMangaMiniBatch` – пакетное получение заголовка и обложки манги для обзоров.

### Якоря навигации
| Сущность | Паттерн якоря | Пример ссылки |
|----------|---------------|---------------|
| Review | `#review-{id}` | `/manga/55#review-42` |
| Post | `#post-{id}` | `/forum/thread/100#post-314` |
| Comment | `#comment-{id}` | `/manga/55#comment-777` |
| Comment (глава) | `#comment-{id}` | `/reader/123#comment-777` |
| Thread | `#from-tops` (контекст) | `/forum/thread/100#from-tops` |
| Wall Post | `#wall-post-{id}` | `/profile/17#wall-post-555` |

Компоненты `PostTree`, `CommentItem` уже содержат id. Для обзоров требуется добавить `id="review-{id}"` на контейнер рендера отзыва в странице манги (если ещё не добавлено).

### Скелетоны и ошибки
Каждый таб управляется отдельным ключом React Query и использует `LeaderboardSkeleton` и `LeaderboardError` для graceful degradation.

### Поддержка и расширение
1. Новые метрики добавлять аддитивно (не ломать существующие query-параметры).
2. Сохранять лёгкость DTO – расширенную инфу получать фронтом пакетно.
3. При удалении alias полей уведомить и провести двухэтапную миграцию.
4. Якорные паттерны стабильны – избегать переименования.
5. При росте объёма рассмотреть пагинацию или virtual scroll.
6. Стеновые посты используют вычисляемый `score = up - down`; fallback сортировка по up, затем по дате.

## Wall Posts (стена пользователей)

Новый рейтинг постов на пользовательских стенах (`/api/posts/tops`). Контент рендерится с поддержкой Markdown (GFM, спойлеры в формате `||текст||`). Если присутствуют `references` с `type = MANGA`, автоматически отображаются мини‑карточки соответствующих тайтлов под постом.

### Параметры
- `range=all|today|7|30` – временное окно. `today` = последние 24 часа.
- `limit` (1..100, по умолчанию 20 на бэке, 15 на фронте).

### Сортировка
1. `score DESC` (где `score = up - down`)
2. `up DESC`
3. `createdAt DESC`

### DTO (TopWallPostDTO)
```jsonc
{
  "id": 123,
  "userId": 17,
  "content": "Полный текст поста...",
  "createdAt": "2025-09-26T12:34:56",
  "editedUntil": "2025-10-03T12:34:56",
  "attachments": [ { "id": 1, "filename": "img.png", "url": "https://...", "sizeBytes": 12345 } ],
  "references": [ { "id": 9, "type": "MANGA", "refId": 55 } ],
  "stats": { "score": 12, "up": 14, "down": 2, "userVote": 1, "commentsCount": 0 }
}
```

### Анкоры
Карточки на странице топов получают id=`wall-post-{id}`; переход ведёт на `/profile/{userId}#wall-post-{id}`.

### Ограничения
- Пока без агрегации `commentsCount` (0 placeholder) – потребуется интеграция с CommentService при появлении комментариев к стеновым постам.
- Кэширование / rate limiting аналогично другим топам (пока клиентское ttl через React Query).

### Дополнения (Persist & Authoritative Levels)
- Активная вкладка топов сохраняется в URL как `?tab=...` чтобы при возврате назад состояние не сбрасывалось.
- Для карточек пользователей теперь запрашивается авторитетный уровень и общий XP через батч-хук (`/levels/{id}`), вместо локальных эвристик. При недоступности эндпоинта отображаются поля из DTO как есть.

