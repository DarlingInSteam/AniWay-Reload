# AniWay Manga Reader - MVP

Система для чтения манги, состоящая из трёх микросервисов:
- **MangaService** (порт 8081) - управление мангой и веб-интерфейс
- **ChapterService** (порт 8082) - управление главами
- **ImageStorageService** (порт 8083) - хранение изображений в MinIO

## Технологии

- Java 23
- Spring Boot 3.5.4
- PostgreSQL 16
- MinIO (объектное хранилище)
- Thymeleaf (шаблоны)
- Bootstrap 5 (UI)

## Функционал MVP

### ✅ Реализовано
1. **Каталог манги** - просмотр всех добавленных манг без поиска и фильтрации
2. **Страница манги** - описание, дата выхода, количество глав, список глав
3. **Чтение манги** - просмотр страниц главы с навигацией между главами
4. **Веб-форма** - создание манги и глав через удобный интерфейс
5. **API** - REST API для всех операций

### 📋 Архитектура
- **MangaService**: хранит информацию о манге, предоставляет веб-интерфейс
- **ChapterService**: управляет главами манги
- **ImageStorageService**: загружает и хранит изображения страниц в MinIO

## Быстрый запуск

### 1. Запуск инфраструктуры
```bash
# Запуск PostgreSQL и MinIO через Docker
docker-compose up -d
```

### 2. Создание таблиц в базах данных
```bash
# Подключение к базам данных и выполнение SQL скриптов
# Manga DB (порт 5432)
psql -h localhost -p 5432 -U manga_user -d manga_db -f MangaService/mangaDB.sql

# Chapter DB (порт 5433)  
psql -h localhost -p 5433 -U chapter_user -d chapter_db -f ChapterService/chapterDB.sql

# Image Storage DB (порт 5434)
psql -h localhost -p 5434 -U image_user -d image_storage_db -f ImageStorageService/imageStorageDB.sql
```

### 3. Запуск сервисов
```bash
# Терминал 1 - ImageStorageService
cd ImageStorageService
./gradlew bootRun

# Терминал 2 - ChapterService  
cd ChapterService
./gradlew bootRun

# Терминал 3 - MangaService
cd MangaService
./gradlew bootRun
```

### 4. Доступ к системе
- **Веб-интерфейс**: http://localhost:8081/manga
- **MinIO консоль**: http://localhost:9001 (admin/password: minioadmin)

## Использование

### Добавление манги
1. Откройте http://localhost:8081/manga
2. Нажмите "Добавить мангу"
3. Заполните форму и сохраните
4. На странице манги нажмите "Добавить главу"
5. Загрузите изображения страниц в правильном порядке

### Чтение
1. В каталоге выберите мангу
2. На странице манги выберите главу
3. Используйте навигацию:
   - Стрелки влево/вправо или A/D - переключение страниц
   - Стрелки вверх/вниз - переключение глав
   - F - полноэкранный режим

## API Endpoints

### MangaService (8081)
- `GET /api/manga` - список всех манг
- `POST /api/manga` - создание манги
- `GET /api/manga/{id}` - информация о манге

### ChapterService (8082)
- `GET /api/chapters/manga/{mangaId}` - главы манги
- `POST /api/chapters` - создание главы
- `GET /api/chapters/{id}` - информация о главе

### ImageStorageService (8083)
- `GET /api/images/chapter/{chapterId}` - изображения главы
- `POST /api/images/chapter/{chapterId}/multiple` - загрузка изображений
- `GET /api/images/chapter/{chapterId}/count` - количество страниц

## Структура проекта

```
├── docker-compose.yml          # PostgreSQL + MinIO
├── MangaService/              
│   ├── src/main/java/         # Java код
│   ├── src/main/resources/templates/  # HTML шаблоны
│   └── mangaDB.sql           # SQL схема
├── ChapterService/
│   ├── src/main/java/        # Java код  
│   └── chapterDB.sql         # SQL схема
└── ImageStorageService/
    ├── src/main/java/        # Java код
    └── imageStorageDB.sql    # SQL схема
```

## Следующие этапы развития

1. **Поиск и фильтрация** в каталоге
2. **Пользователи** и избранное
3. **Комментарии** к главам
4. **Уведомления** о новых главах
5. **Мобильное приложение**
6. **Администрирование**

## Возможные проблемы

1. **Сервисы не запускаются** - проверьте доступность портов 5432-5434, 8081-8083, 9000-9001
2. **Ошибки базы данных** - убедитесь, что Docker контейнеры запущены и SQL скрипты выполнены
3. **Изображения не загружаются** - проверьте настройки MinIO и доступность порта 9000

## Лицензия

MIT License
