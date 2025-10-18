# ParserService - Java/Spring Parser для MangaLib

## Описание

ParserService - это полноценная замена MelonService на Java/Spring Boot, реализующая парсинг манги с MangaLib.

### Основные преимущества миграции на Java/Spring:

✅ **Производительность**: Многопоточная обработка с использованием CompletableFuture  
✅ **Стабильность**: Строгая типизация, compile-time проверки  
✅ **Масштабируемость**: Легкая интеграция с Spring ecosystem  
✅ **Мониторинг**: Spring Actuator для метрик и health checks  
✅ **Совместимость**: Полная API-совместимость с MelonService  

## Реализованный функционал

### 1. Парсинг манги (Parse)
- Получение метаданных манги (название, описание, жанры, теги, авторы)
- Получение списка глав с информацией (номер, том, название, платность)
- Сохранение данных в JSON формате
- API: `POST /api/parse`

### 2. Сборка манги (Build)
- Загрузка изображений всех глав
- Параллельная загрузка с пулом потоков
- Организация файловой структуры
- Прогресс отслеживание (главы, изображения)
- API: `POST /api/build`

### 3. Автопарсинг каталога
- Получение списка манги из каталога MangaLib
- Фильтрация по количеству глав (min/max)
- Пакетный парсинг с прогрессом
- Автоматический импорт в систему
- API: `POST /api/auto-parse/start`

### 4. Управление задачами
- Создание и отслеживание задач
- Real-time статус и прогресс
- Логирование операций
- Хранение истории
- API: `GET /api/status/{taskId}`

### 5. Обслуживание (Maintenance)
- Очистка старых файлов (> 30 дней)
- Список спарсенных манг
- Удаление конкретной манги
- API: `POST /api/maintenance/mangalib/cleanup`

## Архитектура

```
ParserService/
├── config/              # Конфигурация Spring
│   └── ParserProperties.java
├── dto/                 # Data Transfer Objects
│   ├── MangaMetadata.java
│   ├── ChapterInfo.java
│   ├── ParseResult.java
│   ├── ParseTask.java
│   ├── BuildTask.java
│   └── AutoParseTask.java
├── service/             # Бизнес-логика
│   ├── MangaLibParserService.java    # Парсинг MangaLib API
│   ├── MangaBuildService.java        # Сборка изображений
│   ├── AutoParsingService.java       # Автопарсинг каталога
│   ├── ImageDownloadService.java     # Загрузка изображений
│   ├── ProxyManagerService.java      # Управление прокси
│   ├── TaskStorageService.java       # Хранение задач
│   └── MaintenanceService.java       # Очистка и обслуживание
└── web/                 # REST Controllers
    ├── ParserTaskController.java
    └── AutoParsingController.java
```

## API Endpoints

### Парсинг

```bash
# Парсинг манги
POST /api/parse
{
  "slug": "solo-leveling",
  "parser": "mangalib"
}

# Билд манги (загрузка изображений)
POST /api/build
{
  "slug": "solo-leveling",
  "parser": "mangalib",
  "branch_id": null
}

# Статус задачи
GET /api/status/{taskId}
```

### Автопарсинг

```bash
# Запуск автопарсинга
POST /api/auto-parse/start
{
  "page": 1,
  "limit": 10,
  "min_chapters": 50,
  "max_chapters": 200
}

# Статус автопарсинга
GET /api/auto-parse/status/{taskId}
```

### Обслуживание

```bash
# Очистка старых файлов
POST /api/maintenance/mangalib/cleanup

# Список спарсенных манг
GET /api/list-parsed
```

## Конфигурация

```yaml
# application.yml
parser:
  output-path: /app/output
  temp-path: /app/temp
  max-parallel-downloads: 20
  image-timeout-seconds: 30
```

## Технологии

- **Java 21** - Современный LTS релиз
- **Spring Boot 3.5.6** - Фреймворк
- **Spring WebFlux** - Реактивное программирование
- **Jackson** - JSON обработка
- **Apache Commons** - Утилиты
- **Lombok** - Упрощение кода
- **RestTemplate** - HTTP клиент

## Производительность

### Оптимизации:

1. **Параллельная загрузка изображений** - пул из 20 потоков
2. **Асинхронная обработка** - CompletableFuture для неблокирующих операций
3. **Кэширование** - ConcurrentHashMap для быстрого доступа к задачам
4. **Пул прокси** - ротация для обхода rate limits
5. **Оптимизация памяти** - streaming для больших файлов

### Метрики:

- Парсинг манги: ~2-5 сек
- Билд главы (30 изображений): ~10-15 сек
- Автопарсинг каталога (100 манг): ~3-5 мин

## Интеграция с существующей системой

ParserService полностью совместим с MangaService API:

```java
// MangaService/MelonIntegrationService.java
@Value("${melon.service.url:http://parser-service:8084}")
private String melonServiceUrl;

// Все запросы автоматически перенаправляются на ParserService
// Никаких изменений в MangaService не требуется
```

## Docker

```yaml
# docker-compose.yml
parser-service:
  build:
    context: ./ParserService
    dockerfile: Dockerfile
  ports:
    - "8084:8084"
  environment:
    - SPRING_PROFILES_ACTIVE=prod
    - PARSER_OUTPUT_PATH=/app/output
  volumes:
    - parser-data:/app/output
```

## Дальнейшее развитие

### Планируемые улучшения:

- [ ] WebSocket для real-time прогресса
- [ ] Redis для распределенного хранения задач
- [ ] Kafka для event streaming
- [ ] Prometheus метрики
- [ ] GraphQL API
- [ ] Rate limiting
- [ ] Retry механизмы с exponential backoff
- [ ] Circuit breaker для внешних API
- [ ] Автообновление манги (check для новых глав)
- [ ] Batch операции для множественного импорта

## Тестирование

```bash
# Запуск тестов
./gradlew test

# С coverage
./gradlew test jacocoTestReport
```

## Мониторинг

Spring Actuator endpoints:

```bash
# Health check
GET /actuator/health

# Metrics
GET /actuator/metrics

# Info
GET /actuator/info
```

## Логирование

Все операции логируются с уровнями:

- **INFO** - основные операции (старт/завершение задач)
- **DEBUG** - детальная информация (статусы, прогресс)
- **WARN** - проблемы прокси, ошибки загрузки
- **ERROR** - критические ошибки

## Миграция с MelonService

### Шаг 1: Развертывание ParserService

```bash
cd ParserService
./gradlew build
docker-compose up -d parser-service
```

### Шаг 2: Переключение трафика

```yaml
# Изменить в MangaService
melon.service.url: http://parser-service:8084
```

### Шаг 3: Проверка

```bash
# Тест парсинга
curl -X POST http://localhost:8084/api/parse \
  -H "Content-Type: application/json" \
  -d '{"slug":"solo-leveling","parser":"mangalib"}'
```

### Шаг 4: Вывод MelonService из эксплуатации

После полного тестирования можно отключить MelonService.

## Поддержка

При возникновении проблем проверьте:

1. Логи: `docker logs parser-service`
2. Health check: `curl http://localhost:8084/actuator/health`
3. Доступность MangaLib API
4. Наличие свободного места на диске

## Лицензия

MIT License - см. LICENSE файл
