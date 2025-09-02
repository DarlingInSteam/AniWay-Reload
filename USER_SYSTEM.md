# Система пользователей AniWay

## Обзор

Комплексная система пользователей для платформы AniWay включает:
- 🔐 Аутентификацию и авторизацию
- 📚 Систему закладок с 5 статусами
- 📖 Отслеживание прогресса чтения
- 👤 Профили пользователей
- 🛡️ Административный доступ
- 🌍 Роль переводчика
- 🔍 Поиск пользователей

## Архитектура

### Backend (Spring Boot)
- **AuthService**: Микросервис аутентификации с JWT
- **База данных**: PostgreSQL (auth_postgres)
- **Таблицы**: users, bookmarks, reading_progress
- **Gateway**: Spring Cloud Gateway с маршрутизацией

### Frontend (React/TypeScript)
- **Контекст**: AuthContext для управления состоянием
- **Хуки**: useBookmarks, useProgress для работы с данными
- **Компоненты**: Переиспользуемые UI компоненты
- **Страницы**: Профиль, библиотека, аутентификация

## Функции

### 1. Аутентификация и авторизация
- Регистрация новых пользователей
- Вход с JWT токенами
- Роли: USER, ADMIN, TRANSLATOR
- Защищённые маршруты

### 2. Система закладок
Статусы чтения:
- **Читаю** (READING) - Активно читаемые манги
- **Буду читать** (PLAN_TO_READ) - В планах к прочтению
- **Прочитано** (COMPLETED) - Полностью прочитанные
- **Отложено** (ON_HOLD) - Временно отложенные
- **Брошено** (DROPPED) - Больше не читаю
- **Любимое** - Дополнительная отметка для любых статусов

### 3. Прогресс чтения
- Отслеживание страниц по главам
- Последняя прочитанная позиция
- Процент прочтения манги
- История чтения

### 4. Профили пользователей
- Персональная информация
- Аватар и биография
- Статистика чтения
- Любимые жанры

### 5. Административные функции
- Управление пользователями
- Модерация контента
- Системная аналитика

## API Endpoints

### Аутентификация
```
POST /api/auth/register - Регистрация
POST /api/auth/login - Вход
GET /api/users/me - Профиль пользователя
PUT /api/users/me - Обновление профиля
```

### Закладки
```
GET /api/bookmarks - Все закладки пользователя
POST /api/bookmarks - Создать/обновить закладку
DELETE /api/bookmarks/{mangaId} - Удалить закладку
GET /api/bookmarks/status/{status} - По статусу
GET /api/bookmarks/favorites - Избранные
```

### Прогресс чтения
```
GET /api/progress - Весь прогресс пользователя
POST /api/progress - Сохранить прогресс
GET /api/progress/manga/{mangaId} - Прогресс по манге
GET /api/progress/chapter/{chapterId} - Прогресс главы
DELETE /api/progress/chapter/{chapterId} - Удалить прогресс
```

## Использование

### 1. Интеграция AuthProvider
```tsx
import { AuthProvider } from './contexts/AuthContext'

function App() {
  return (
    <AuthProvider>
      {/* Ваше приложение */}
    </AuthProvider>
  )
}
```

### 2. Использование хука аутентификации
```tsx
import { useAuth } from './contexts/AuthContext'

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth()
  
  if (!isAuthenticated) {
    return <div>Войдите в систему</div>
  }
  
  return <div>Привет, {user.username}!</div>
}
```

### 3. Защищённые маршруты
```tsx
import { ProtectedRoute } from './contexts/AuthContext'

<Route path="/admin" element={
  <ProtectedRoute requireAdmin>
    <AdminPage />
  </ProtectedRoute>
} />
```

### 4. Компонент закладок
```tsx
import { BookmarkControls } from './components/bookmarks/BookmarkControls'

<BookmarkControls mangaId={mangaId} />
```

### 5. Прогресс чтения
```tsx
import { ReadingProgressBar } from './components/progress/ReadingProgress'

<ReadingProgressBar 
  mangaId={mangaId} 
  totalChapters={manga.totalChapters} 
/>
```

## Компоненты

### Auth
- `LoginForm` - Форма входа
- `RegisterForm` - Форма регистрации  
- `UserMenu` - Меню пользователя в header

### Bookmarks
- `BookmarkControls` - Управление закладками
- `BookmarkBadge` - Отображение статуса

### Progress
- `ReadingProgressBar` - Прогресс по манге
- `ChapterProgress` - Прогресс главы
- `LastReadChapter` - Последняя глава
- `RecentlyRead` - Недавно прочитанное

## Стилизация

Все компоненты адаптированы под тёмную тему AniWay:
- Используют CSS переменные темы
- Поддерживают адаптивный дизайн
- Соответствуют дизайн-системе

## Безопасность

- JWT токены с истечением срока
- Валидация на клиенте и сервере
- Защита от CSRF
- Хеширование паролей (bcrypt)

## Развёртывание

1. Убедитесь, что AuthService запущен
2. База данных auth_postgres настроена
3. Gateway маршруты сконфигурированы
4. Frontend собран с новыми компонентами

## Дальнейшее развитие

- [ ] Социальная аутентификация (Google, Discord)
- [ ] Push-уведомления
- [ ] Система достижений
- [ ] Рекомендации на основе предпочтений
- [ ] Экспорт/импорт библиотек
- [ ] API для мобильного приложения
