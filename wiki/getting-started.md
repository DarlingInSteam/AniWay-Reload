# Getting Started

Данное руководство поможет вам развернуть проект AniWay локально для разработки.

## Системные требования

### Обязательные компоненты:
- **Docker Desktop** 4.0+
- **Git** 2.30+
- **Node.js** 18+ (для локальной разработки фронтенда)
- **Java 21** (для локальной разработки бекенда)

### Рекомендуемые IDE:
- **IntelliJ IDEA** (для Java разработки)
- **VS Code** (для фронтенд разработки)

## Клонирование репозитория

```bash
git clone https://github.com/DarlingInSteam/AniWay-Reload.git
cd AniWay-Reload
```

## Запуск проекта в Docker

### Основная команда для локальной разработки:

```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

### Почему именно эта команда:

1. **docker-compose.yml** - базовая конфигурация сервисов
2. **docker-compose.dev.yml** - дополнительные настройки для разработки (перезагрузка кода, дебаг порты, volume маппинг)
3. **-f флаг** - позволяет объединить несколько compose файлов
4. **up -d** - запускает контейнеры в фоновом режиме
5. **--build** - пересобирает образы при изменениях в коде

### Альтернативные команды:

```bash
# Быстрый старт без пересборки (если образы уже собраны)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Остановка всех сервисов
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

# Пересборка конкретного сервиса
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build auth-service

# Просмотр логов сервиса
docker logs auth-service --tail=50
```

## Структура сервисов

После запуска будут доступны следующие сервисы:

| Сервис | Порт | Описание |
|--------|------|----------|
| Frontend | 5173 | React приложение |
| Gateway | 8080 | API Gateway |
| Auth Service | 8081 | Аутентификация |
| Manga Service | 8082 | Управление мангой |
| Chapter Service | 8083 | Управление главами |
| Image Storage | 8084 | Хранение изображений |
| Melon Service | 8085 | Парсинг (Python) |

### Базы данных:
- **auth-postgres** (5432) - PostgreSQL для AuthService
- **manga-postgres** (5433) - PostgreSQL для MangaService
- **chapter-postgres** (5434) - PostgreSQL для ChapterService
- **image-postgres** (5435) - PostgreSQL для ImageStorage

## Проверка работоспособности

1. **Фронтенд**: http://localhost:5173
2. **API Gateway**: http://localhost:8080/actuator/health
3. **Auth Service**: http://localhost:8081/actuator/health

## Инициализация данных

### Создание тестового пользователя:

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Вход в систему:

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

## Разработка

### Режимы разработки:

1. **Полный Docker** - все сервисы в контейнерах (рекомендуется для новичков)
2. **Гибридный** - бекенд в Docker, фронтенд локально
3. **Локальный** - все сервисы локально (только для опытных разработчиков)

### Hot Reload

В dev режиме включен hot reload для:
- **Frontend** - автоматическое обновление при изменении React компонентов
- **Backend** - автоматическая перекомпиляция Java сервисов при изменениях

## Очистка окружения

```bash
# Остановка и удаление контейнеров
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down

# Удаление volumes (ВНИМАНИЕ: удалит все данные БД)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v

# Очистка неиспользуемых образов
docker system prune -f
```

## Частые проблемы

### Порты заняты
```bash
# Проверить какой процесс использует порт
netstat -ano | findstr :3000
# Убить процесс
taskkill /PID <PID> /F
```

### Проблемы с правами в Windows
```bash
# Запустить Docker Desktop от имени администратора
# Или добавить пользователя в группу docker-users
```

### Ошибки сборки
```bash
# Очистить Docker cache
docker system prune -a
# Пересобрать с нуля
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache
```

## Следующие шаги

1. Ознакомьтесь с [Development Workflow](development-workflow)
2. Изучите структуру проекта в [Frontend Guide](frontend-guide) или [Backend Guide](backend-guide)
3. Настройте IDE согласно [Code Style](code-style)

---

**Важно**: Всегда используйте dev конфигурацию для локальной разработки. Продакшн конфигурация предназначена только для деплоя.
