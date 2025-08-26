# AniWay API Gateway

API Gateway для системы чтения манги AniWay. Предоставляет единую точку входа для всех клиентских запросов к микросервисам.

## 🚀 Функции Gateway

- **Единая точка входа** - все запросы через порт 8080
- **Маршрутизация** - автоматическое перенаправление к нужным сервисам
- **CORS поддержка** - настроенная политика для фронтенда
- **Логирование** - детальное логирование всех запросов
- **Мониторинг** - endpoints для проверки здоровья сервисов
- **Обработка ошибок** - структурированные ответы об ошибках

## 🏗️ Архитектура маршрутизации

```
Frontend/Client → API Gateway (8080) → Backend Services
                        │
                        ├─ /api/manga/**     → MangaService (8081)
                        ├─ /manga/**         → MangaService Web UI (8081)
                        ├─ /reader/**        → MangaService Reader (8081)
                        ├─ /chapters/**      → MangaService Chapters (8081)
                        ├─ /api/chapters/**  → ChapterService (8082)
                        ├─ /api/images/**    → ImageStorageService (8083)
                        └─ /static/**        → Static Resources (8081)
```

## 📡 Gateway Endpoints

### Мониторинг Gateway

**GET /api/gateway/health**
- Проверка здоровья Gateway
- Ответ: `{"status": "UP", "message": "API Gateway работает корректно"}`

**GET /api/gateway/info**
- Информация о Gateway и версии
- Ответ: Детальная информация о конфигурации

**GET /api/gateway/routes** 
- Список всех активных маршрутов
- Ответ: Массив объектов с информацией о маршрутах

**GET /api/gateway/services/health**
- Комплексная проверка всех backend сервисов
- Ответ: Статус каждого сервиса (UP/DOWN/DEGRADED)

### Spring Boot Actuator

**GET /actuator/health**
- Стандартная проверка здоровья Spring Boot

**GET /actuator/gateway/routes**
- Детальная информация о маршрутах Gateway

## 🛠️ Настройка и запуск

### Предварительные требования

1. Java 21+
2. Запущенные backend сервисы:
   - MangaService на порту 8081
   - ChapterService на порту 8082  
   - ImageStorageService на порту 8083

### Запуск Gateway

```bash
# Компиляция и запуск
./gradlew bootRun

# Или собрать JAR и запустить
./gradlew build
java -jar build/libs/GateWayService-0.0.1-SNAPSHOT.jar
```

Gateway будет доступен на `http://localhost:8080`

## 🌐 CORS настройки

Gateway настроен для работы с:
- `http://localhost:3000` (React dev server)
- `http://localhost:5173` (Vite dev server)
- `http://localhost:8080` (сам Gateway)
- `http://localhost:8081` (MangaService статические страницы)

Поддерживаемые методы: GET, POST, PUT, DELETE, OPTIONS, HEAD

## 📝 Использование

### Для фронтенда

Теперь все API запросы должны направляться на Gateway:

```javascript
// Вместо: http://localhost:8081/api/manga
// Используйте: http://localhost:8080/api/manga

const response = await fetch('http://localhost:8080/api/manga');
const mangaList = await response.json();
```

### Для веб-интерфейса

Статический веб-интерфейс MangaService также доступен через Gateway:
- Каталог: `http://localhost:8080/manga`
- Создание манги: `http://localhost:8080/manga/create`
- Ридер: `http://localhost:8080/reader/{chapterId}`

## 🔧 Конфигурация

Основная конфигурация в `application.yml`:

- Порт Gateway: `server.port: 8080`
- Тайм-ауты соединения: 10 секунд
- Тайм-ауты ответа: 30 секунд
- Логирование: DEBUG уровень для Gateway компонентов

## 🚨 Устранение неполадок

### Проверка здоровья сервисов

```bash
curl http://localhost:8080/api/gateway/services/health
```

### Проверка маршрутов

```bash
curl http://localhost:8080/api/gateway/routes
```

### Логи Gateway

Gateway выводит детальные логи всех запросов:
```
🌐 Incoming Request: GET /api/manga from 127.0.0.1
✅ Response: GET /api/manga → 200 | Duration: 45ms
```

### Типичные проблемы

1. **503 Service Unavailable** - Backend сервис недоступен
   - Проверьте, что сервис запущен на правильном порту
   - Проверьте логи сервиса

2. **CORS ошибки** - Неправильная настройка CORS
   - Убедитесь что origin добавлен в allowed-origins
   - Проверьте preflight запросы (OPTIONS)

3. **404 Not Found** - Неправильный маршрут
   - Проверьте список маршрутов: `/api/gateway/routes`
   - Убедитесь что путь соответствует предикатам

## 📈 Мониторинг

Gateway предоставляет несколько способов мониторинга:

1. **Custom endpoints** - `/api/gateway/*`
2. **Spring Actuator** - `/actuator/*` 
3. **Подробное логирование** всех запросов
4. **Метрики производительности** (время ответа)

## 🔒 Безопасность

Текущая конфигурация подходит для development окружения. Для production рекомендуется:

1. Ограничить CORS origins конкретными доменами
2. Добавить rate limiting
3. Добавить аутентификацию/авторизацию
4. Настроить HTTPS
5. Добавить мониторинг и алерты

---

**Автор:** AniWay Development Team  
**Версия:** 1.0.0
