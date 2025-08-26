# AniWay Image System

Система управления мангой с микросервисной архитектурой.

## 🚀 Быстрый старт

### Обычный запуск
```bash
# Windows
start.bat

# Linux/macOS
./start.sh
```

### Режим разработки (рекомендуется)
```bash
# Windows
start-dev.bat

# Linux/Mac  
./start.sh dev
```

### Быстрый запуск без очистки кэша
```bash
# Windows
start-dev-fast.bat
```

### Production режим
```bash
# Windows
start-prod.bat

# Linux/Mac
./start.sh prod
```

## 📋 Что включено

### Сервисы
- **Frontend** (React + Vite) - http://localhost:5173 (dev) / http://localhost:3000 (prod)
- **Gateway Service** (Spring Cloud Gateway) - http://localhost:8080
- **Manga Service** (Spring Boot) - http://localhost:8081
- **Chapter Service** (Spring Boot) - http://localhost:8082
- **Image Storage Service** (Spring Boot) - http://localhost:8083

### Инфраструктура
- **PostgreSQL** (3 инстанса для разных сервисов):
  - Manga DB: localhost:5435
  - Chapter DB: localhost:5433
  - Image Storage DB: localhost:5434
- **MinIO** (S3-совместимое хранилище):
  - API: http://localhost:9000
  - Console: http://localhost:9001 (admin/minioadmin)

## 🛠️ Управление системой

### Просмотр логов
```bash
# Все сервисы
docker-compose logs -f

# Конкретный сервис
docker-compose logs -f manga-service
```

### Остановка системы
```bash
docker-compose down
```

### Полная очистка (удаление volumes)
```bash
docker-compose down -v
docker system prune -f
```

### Пересборка конкретного сервиса
```bash
docker-compose up --build manga-service
```

## 🔧 Разработка

### Режим разработки
В режиме разработки включен hot-reload для всех сервисов:
- Spring Boot DevTools для Java сервисов
- Vite dev server для фронтенда

### Структура проекта
```
├── MangaService/          # Сервис управления мангой
├── ChapterService/        # Сервис управления главами
├── ImageStorageService/   # Сервис хранения изображений
├── GateWayService/        # API Gateway
├── AniWayFrontend/        # React фронтенд
├── docker-compose.yml     # Продакшн конфигурация
├── docker-compose.dev.yml # Конфигурация для разработки
└── start.bat/start.sh     # Скрипты запуска
```

## 📊 База данных

Система использует отдельные PostgreSQL базы для каждого сервиса:
- **manga_db** (порт 5435): База данных мангы
- **chapter_db** (порт 5433): База данных глав
- **image_storage_db** (порт 5434): База данных хранения изображений

Данные сохраняются в Docker volumes и не удаляются при перезапуске контейнеров.

## 🔍 Отладка

### Подключение к базе данных
```bash
# Подключение к базе мангы
docker exec -it manga-postgres psql -U manga_user -d manga_db

# Подключение к базе глав
docker exec -it chapter-postgres psql -U chapter_user -d chapter_db

# Подключение к базе изображений
docker exec -it image-storage-postgres psql -U image_user -d image_storage_db
```

### Проверка состояния контейнеров
```bash
docker-compose ps
```

### Перезапуск конкретного сервиса
```bash
docker-compose restart manga-service
```

## ⚡ Требования

- Docker 20.10+
- Docker Compose 1.29+
- 4GB+ RAM для комфортной работы всех сервисов

# 🐳 Docker Setup для AniWay System

Этот проект настроен для удобной разработки и деплоя с помощью Docker и Docker Compose.

## 🚀 Быстрый старт

### Режим разработки (рекомендуется)
```bash
# Windows
start-dev.bat

# Linux/Mac  
./start.sh dev
```

### Быстрый запуск без очистки кэша
```bash
# Windows
start-dev-fast.bat
```

### Production режим
```bash
# Windows
start-prod.bat

# Linux/Mac
./start.sh prod
```

## 📋 Что включено

### Сервисы
- **Frontend** (React + Vite) - http://localhost:5173 (dev) / http://localhost:3000 (prod)
- **Gateway Service** (Spring Cloud Gateway) - http://localhost:8080
- **Manga Service** (Spring Boot) - http://localhost:8081
- **Chapter Service** (Spring Boot) - http://localhost:8082
- **Image Storage Service** (Spring Boot) - http://localhost:8083

### Инфраструктура
- **PostgreSQL** (3 инстанса для разных сервисов):
  - Manga DB: localhost:5435
  - Chapter DB: localhost:5433
  - Image Storage DB: localhost:5434
- **MinIO** (S3-совместимое хранилище):
  - API: http://localhost:9000
  - Console: http://localhost:9001 (admin/minioadmin)

## 🛠️ Режимы работы

### Development Mode
- **Hot Reload**: Все изменения в коде применяются автоматически
- **Volume Mounting**: Исходный код монтируется в контейнеры
- **Debug Friendly**: JVM настроена для отладки
- **Fast Builds**: Gradle и npm кэш сохраняется между запусками

### Production Mode
- **Optimized Images**: Минимальные Docker образы
- **Multi-stage Builds**: Уменьшенный размер контейнеров
- **Static Assets**: Frontend собирается и сервится через Nginx

## 🔧 Команды для разработки

### Остановить все сервисы
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down
```

### Пересобрать конкретный сервис
```bash
# Пример для manga-service
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build manga-service
```

### Посмотреть логи сервиса
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml logs -f manga-service
```

### Очистить все (внимание: удалит данные БД!)
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down --volumes
docker system prune -af
```

## 🐛 Решение проблем

### "Failed to solve: openjdk:21-jre-slim: not found"
Эта проблема уже исправлена - все Dockerfile'ы обновлены для использования актуального образа `eclipse-temurin:21-jre`.

### "Failed to compute cache key"
Запустите `start-dev.bat` - он автоматически очищает проблемный кэш Docker.

### Медленная сборка
- Используйте `start-dev-fast.bat` для последующих запусков
- Gradle и npm зависимости кэшируются в Docker volumes

### Проблемы с портами
Убедитесь, что порты 3000, 5173, 8080-8083, 5433-5435, 9000-9001 не заняты другими приложениями.

## 📁 Структура файлов

```
├── docker-compose.yml          # Основная конфигурация
├── docker-compose.dev.yml      # Переопределения для разработки
├── start-dev.bat              # Полная очистка + запуск dev
├── start-dev-fast.bat         # Быстрый запуск dev
├── start-prod.bat             # Production запуск
├── MangaService/
│   ├── Dockerfile             # Production образ
│   └── Dockerfile.dev         # Development образ
├── ChapterService/
│   ├── Dockerfile
│   └── Dockerfile.dev
├── ImageStorageService/
│   ├── Dockerfile
│   └── Dockerfile.dev
├── GateWayService/
│   ├── Dockerfile
│   └── Dockerfile.dev
└── AniWayFrontend/
    ├── Dockerfile             # Production (Nginx)
    └── Dockerfile.dev         # Development (Vite)
```

## 🎯 Рекомендации для разработки

1. **Первый запуск**: Используйте `start-dev.bat`
2. **Ежедневная работа**: Используйте `start-dev-fast.bat`
3. **При проблемах**: Вернитесь к `start-dev.bat`
4. **Тестирование**: Проверяйте на `start-prod.bat` перед коммитом

## 📊 Мониторинг

- Все сервисы настроены с health checks
- MinIO Console доступна для управления файлами
- Каждая БД доступна для подключения внешними клиентами

---

🎉 **Готово! Теперь вы можете удобно разрабатывать, не беспокоясь о ручной сборке каждого сервиса.**
