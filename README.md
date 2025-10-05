# AniWay - Платформа для чтения манги

AniWay - полнофункциональная платформа для чтения манги, построенная на микросервисной архитектуре с современным React frontend и Spring Boot backend сервисами.

## Архитектура

### Backend сервисы
- **AuthService** (порт 8085) - Аутентификация, управление пользователями, закладки, прогресс чтения
- **MangaService** (порт 8081) - Управление каталогом манги, интеграция с парсерами
- **ChapterService** (порт 8082) - Управление главами и их содержимым
- **ImageStorageService** (порт 8083) - Хранение изображений в MinIO
- **GatewayService** (порт 8080) - API Gateway с маршрутизацией и CORS
- **MelonService** (порт 8084) - Парсер манги с поддержкой множественных источников

### Frontend
- **React 18** с TypeScript - Современный SPA интерфейс
- **Tailwind CSS** - Стилизация и адаптивный дизайн
- **Vite** - Инструмент сборки и development сервер

### Инфраструктура
- **PostgreSQL** - База данных для каждого микросервиса
- **MinIO** - S3-совместимое объектное хранилище
- **Docker** - Контейнеризация всех компонентов

## Основной функционал

### Управление пользователями и аутентификация
- JWT-based аутентификация и авторизация
- Публичные профили пользователей
- Ролевая система доступа (USER, ADMIN)
- Подтверждение email при регистрации (одноразовый код + verificationToken)
- Восстановление пароля через код на email (3 шага)

### Библиотека манги
- Каталог с возможностями поиска и фильтрации
- Детальные страницы манги с описаниями
- Система рейтингов и тегов
- Отслеживание статуса публикации

### Опыт чтения
- Адаптивный ридер для всех устройств
- Навигация между страницами и главами
- Сохранение прогресса чтения
- Полноэкранный режим чтения

### Персонализация
- Система закладок (избранное)
- История чтения
- Отслеживание прогресса по главам
- Персональная статистика

### Парсинг контента
- Автоматический импорт манги из внешних источников
- Поддержка множественных парсеров
- Пакетная обработка
- WebSocket уведомления о прогрессе

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
- **Vite** как инструмент сборки

### DevOps
- **Docker** для контейнеризации
- **Docker Compose** для оркестрации
- **GitHub Actions** для CI/CD (планируется)

## API документация

Полная документация API доступна в wiki проекта.

### Основные endpoints
- `POST /api/auth/login` - Аутентификация
- `POST /api/auth/email/request-code` / `POST /api/auth/email/verify-code` - Получение и подтверждение кода регистрации (получение verificationToken)
- `POST /api/auth/register` - Регистрация (обязательно передать verificationToken)
- `POST /api/auth/password/reset/request-code` - Запрос кода (silent success если email не существует)
- `POST /api/auth/password/reset/verify-code` - Подтверждение кода → verificationToken
- `POST /api/auth/password/reset/perform` - Установка нового пароля и немедленная выдача JWT (AuthResponse)
- `GET /api/manga` - Список манги
- `GET /api/manga/{id}` - Детали манги
- `GET /api/chapters/manga/{mangaId}` - Главы манги
- `POST /api/bookmarks` - Добавление в закладки
- `GET /api/progress/user/{userId}` - Прогресс чтения

## Структура проекта
```
├── AniWayFrontend/           # React приложение
├── AuthService/              # Сервис аутентификации
├── MangaService/             # Сервис управления мангой
├── ChapterService/           # Сервис управления главами
├── ImageStorageService/      # Сервис хранения изображений
├── GateWayService/           # API Gateway
├── MelonService/             # Сервис парсера манги
├── wiki/                     # Документация проекта
├── docker-compose.yml        # Production конфигурация
├── docker-compose.dev.yml    # Development конфигурация
└── README.md
```

## Лицензия

MIT License - см. файл [LICENSE](LICENSE) для деталей.

---

## Email Verification & Password Reset Flow

### Регистрация
1. Клиент отправляет `POST /api/auth/email/request-code` с email
2. Получает `requestId` и TTL
3. Пользователь вводит код из письма → `POST /api/auth/email/verify-code` (requestId + code)
4. Backend возвращает `verificationToken` (одноразовый, ~15 мин)
5. Клиент вызывает `POST /api/auth/register` с `verificationToken` + данными формы

### Восстановление пароля
### Двухшаговый вход (опционально)
1. Клиент отправляет `POST /api/auth/login` (обычный сценарий). Если сервер возвращает 200 с `token` — вход завершён.
2. Если сервер настроен на двухшаговый режим или возвращает 400 (логика может быть расширена), клиент повторно отправляет `POST /api/auth/login/request-code` c теми же `username/password`.
3. Сервер валидирует пароль, создаёт `EmailVerification` с purpose=LOGIN и возвращает `{ requestId, ttlSeconds }`.
4. Клиент показывает поле ввода 6‑значного кода и отправляет `POST /api/auth/login/verify-code` с `{ requestId, code }`.
5. Сервер проверяет код, помечает verification как VERIFIED, генерирует одноразовый verificationToken и обменивает его на финальный JWT → `{ token, user }`.

Безопасность:
- Повторная проверка пароля после выдачи кода не требуется (уже проверен на этапе request-code).
- Код одноразовый; после успешной верификации помечается как VERIFIED и token потребляется.
- Реализация расширяет enum `EmailVerification.Purpose` значением `LOGIN`.

По умолчанию (конфиг `auth.login.two-step.enabled=true`) сервер СРАЗУ возвращает `{ twoStep: true, requestId, ttlSeconds }` на `/api/auth/login` и не выдаёт JWT до подтверждения кода.

Отключение: установить переменную окружения `AUTH_LOGIN_TWO_STEP_ENABLED=false`.

Fallback: если отключено — сервер возвращает обычный `{ token, user }`.

1. `POST /api/auth/password/reset/request-code` (email) – всегда 200 (не раскрываем наличие email)
2. `POST /api/auth/password/reset/verify-code` (requestId + code) → `verificationToken`
3. `POST /api/auth/password/reset/perform` (verificationToken + newPassword) → `{ success, token, user }`
4. Автологин встроен (клиент просто сохраняет token из ответа)

### Безопасность
- Коды одноразовые, хранятся как хеш (BCrypt)
- Ограничение попыток (attemptsRemaining)
- Ограничение частоты запросов per email/hour
- VerificationToken одноразовый и привязан к назначению (REGISTRATION / PASSWORD_RESET / ACCOUNT_DELETION)

### Настройка почты
Параметры (application.yml / env):
```
email.verification.code.length=6
email.verification.code.ttl-seconds=600
email.verification.attempts.max=5
email.verification.rate.per-email-hour=5
email.verification.enabled=true
```

### HTML Email Templates
Шаблоны вынесены во внешние файлы в `AuthService/src/main/resources/templates/email/`:

- `verification_registration.html` – регистрация
- `verification_password_reset.html` – сброс пароля
- `verification_account_deletion.html` – удаление аккаунта

Плейсхолдеры:
- `{{CODE}}` – 6‑значный код
- `{{TTL_MINUTES}}` – время жизни (округлено, минимум 1)

Рендер: `EmailTemplateRenderer` читает и кэширует (ConcurrentHashMap). При недоступности файла → fallback минимальный HTML + plain text.

Отправка: `EmailSenderImpl` формирует subject по `EmailVerification.Purpose`, добавляет multipart (plain + HTML) через `MimeMessageHelper`.

Расширение:
1. Добавьте новый файл и обновите switch в `templatePath` внутри `EmailTemplateRenderer`.
2. Дополнительные плейсхолдеры — просто `raw.replace("{{NAME}}", value)`.
3. При необходимости внедрить движок (Thymeleaf / Freemarker) — текущая архитектура легко заменяется.

Безопасность: Код состоит из цифр; XSS-риск отсутствует. Тем не менее применяется простое экранирование.

Plain text версия всегда добавляется для клиентов без HTML.

