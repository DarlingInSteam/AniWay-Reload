# AniWay - Manga Reading Platform

Полнофункциональная платформа для чтения манги, построенная на микросервисной архитектуре с современным React frontend и Spring Boot backend.

## Архитектура системы

### Backend (Микросервисы)
- **AuthService** (8085) - Аутентификация, пользователи, закладки, прогресс чтения
- **MangaService** (8081) - Управление мангой, интеграция с парсерами
- **ChapterService** (8082) - Управление главами и их содержимым
- **ImageStorageService** (8083) - Хранение изображений в MinIO
- **GatewayService** (8080) - API Gateway с маршрутизацией и CORS
- **MelonService** (8084) - Парсер манги с поддержкой множественных источников

### Frontend
- **React 18** с TypeScript - Современный SPA интерфейс
- **Tailwind CSS** - Стилизация и адаптивный дизайн
- **Vite** - Сборщик и dev server

### Инфраструктура
- **PostgreSQL** - База данных для каждого микросервиса
- **MinIO** - S3-совместимое объектное хранилище
- **Docker** - Контейнеризация всех компонентов

## Основной функционал

### Пользователи и аутентификация
- Регистрация и авторизация с JWT токенами
- Публичные профили пользователей
- Система ролей (USER, ADMIN)

### Библиотека манги
- Каталог с поиском и фильтрацией
- Детальные страницы манги с описанием
- Система рейтингов и тегов
- Отслеживание статуса публикации

### Чтение
- Адаптивный ридер для всех устройств
- Навигация между страницами и главами
- Сохранение прогресса чтения
- Полноэкранный режим

### Персонализация
- Система закладок (избранное)
- История чтения
- Трекинг прогресса по главам
- Персональная статистика

### Парсинг контента
- Автоматический импорт манги из внешних источников
- Поддержка множественных парсеров
- Пакетная обработка
- WebSocket уведомления о прогрессе

## Быстрый запуск

### Требования
- Docker и Docker Compose
- Git

### Development режим
```bash
# Клонирование репозитория
git clone <repository-url>
cd AniWay-Reload

# Запуск всех сервисов в dev режиме
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# Инициализация MinIO
# Автоматически создается bucket и настраиваются права доступа
```

### Production режим
```bash
# Запуск в production режиме
docker-compose up -d --build
```

### Доступ к сервисам
- **Frontend**: http://localhost:5173 (dev) / http://localhost:3000 (prod)
- **API Gateway**: http://localhost:8080
- **MinIO Console**: http://localhost:9001 (admin/minioadmin)

## Технологический стек

### Backend
- **Java 21** с Spring Boot 3
- **Spring Security** с JWT аутентификацией
- **Spring Data JPA** для работы с базой данных
- **Spring Cloud Gateway** для API маршрутизации
- **PostgreSQL 16** как основная СУБД
- **MinIO** для хранения изображений

### Frontend
- **React 18** с TypeScript
- **Tailwind CSS** для стилизации
- **React Router** для навигации
- **Axios** для HTTP запросов
- **Vite** как сборщик

### DevOps
- **Docker** для контейнеризации
- **Docker Compose** для оркестрации
- **GitHub Actions** для CI/CD (планируется)

## API документация

Полная документация API доступна в [wiki проекта](wiki/api-documentation.md).

### Основные endpoint'ы
- `POST /api/auth/login` - Авторизация
- `GET /api/manga` - Список манги
- `GET /api/manga/{id}` - Детали манги
- `GET /api/chapters/manga/{mangaId}` - Главы манги
- `POST /api/bookmarks` - Добавление в закладки
- `GET /api/progress/user/{userId}` - Прогресс чтения

## Разработка

### Структура проекта
```
├── AniWayFrontend/           # React приложение
├── AuthService/              # Сервис аутентификации
├── MangaService/             # Сервис управления мангой
├── ChapterService/           # Сервис управления главами
├── ImageStorageService/      # Сервис хранения изображений
├── GateWayService/           # API Gateway
├── MelonService/             # Парсер манги
├── wiki/                     # Документация проекта
├── docker-compose.yml        # Production конфигурация
├── docker-compose.dev.yml    # Development конфигурация
└── README.md
```

### Полезные команды
```bash
# Просмотр логов сервиса
docker-compose logs -f [service-name]

# Перезапуск отдельного сервиса
docker-compose restart [service-name]

# Пересборка с обновлением
docker-compose up -d --build [service-name]

# Очистка volumes (ВНИМАНИЕ: удалит все данные)
docker-compose down -v
```

## Документация

- [Getting Started](wiki/getting-started.md) - Настройка окружения разработки
- [Development Workflow](wiki/development-workflow.md) - Процесс разработки
- [Frontend Guide](wiki/frontend-guide.md) - Разработка фронтенда
- [Backend Guide](wiki/backend-guide.md) - Разработка бэкенда
- [API Documentation](wiki/api-documentation.md) - Справочник по API

## Планы развития

### Краткосрочные (v1.1)
- Улучшение производительности ридера
- Расширенная система фильтрации
- Мобильная оптимизация

### Среднесрочные (v1.2)
- Социальные функции (комментарии, обзоры)
- Система уведомлений
- Advanced admin панель

### Долгосрочные (v2.0)
- Мобильное приложение
- Система рекомендаций
- Многоязычная поддержка

## Лицензия

MIT License - смотрите [LICENSE](LICENSE) файл для деталей.
