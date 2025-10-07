RabbitMQ Setup & Credentials
============================

Problem Observed
----------------
XP события (лайки постов форума, лайки глав, лайки ревью) не доходили до LevelService. В логах сервисов `ForumService`, `ChapterService`, `AuthService` появлялись ошибки:

```
ACCESS_REFUSED - Login was refused using authentication mechanism PLAIN
```

Причина: часть сервисов пыталась подключаться к брокеру с дефолтными учетными данными `guest/guest`. Пользователь `guest` в RabbitMQ по умолчанию ограничен подключениями только с `localhost`. Внутри docker‑сети это приводит к отказу в аутентификации. Брокер был поднят с кастомным пользователем `aniway/aniway_pass`, но сервисы без явной конфигурации продолжали fallback на `guest`.

Внесённые Изменения
-------------------
1. Во всех сервисах добавлены / скорректированы свойства `spring.rabbitmq.username` и `spring.rabbitmq.password` с дефолтом `aniway / aniway_pass`.
2. В `docker-compose.yml` уже задан пользователь брокера через переменные:
   - `RABBITMQ_DEFAULT_USER=aniway`
   - `RABBITMQ_DEFAULT_PASS=aniway_pass`
3. Добавлены контейнеры `forum-postgres` и `forum-service` (раньше forum-service отсутствовал в compose), чтобы события форума можно было воспроизводить локально.
4. Для сервисов, где ранее значения задавались только через переменные окружения compose, теперь и fallback в конфиге совпадает (избегаем возврата к `guest`).

Как Применить Изменения
------------------------
Если контейнер RabbitMQ уже запускался ранее, пользователь `aniway` будет создан только при первой инициализации (отсутствие данных). Для чистого старта:

```powershell
docker compose down
docker rm -f rabbitmq 2>$null
docker volume prune -f   # осторожно: удалит неиспользуемые volume (убедитесь, что это безопасно)
```

Либо точечно удалить volume RabbitMQ, если он будет добавлен (сейчас volume не определён — данные эфемерные).

Затем:

```powershell
docker compose up -d --build rabbitmq
docker compose up -d --build level-service post-service comment-service chapter-service auth-service forum-service
```

Проверка Работоспособности
--------------------------
1. Зайдите в панель управления RabbitMQ: http://localhost:15672 (логин `aniway`, пароль `aniway_pass`). Убедитесь, что пользователь существует.
2. Создайте лайк (форум пост, глава, ревью) из клиента / фронтенда.
3. В логах соответствующего сервиса больше не должно быть `ACCESS_REFUSED`.
4. В логах `level-service` появится обработка события и начисление XP.

Если Ошибка Сохраняется
------------------------
- Убедитесь, что сервис действительно перезапущен (старый jar мог остаться в контейнере).
- Проверьте переменные окружения контейнера: `docker inspect <container> | findstr RABBITMQ_USERNAME`.
- В панели RabbitMQ проверьте раздел Connections — должно быть несколько соединений от разных сервисов.

Дополнительно
-------------
Для production можно:
- Вынести креды в `.env` файл.
- Включить TLS / использовать отдельного пользователя на каждый сервис с ограниченными правами.
- Создать отдельный виртуальный хост (vhost) и явно указать `spring.rabbitmq.virtual-host=/aniway`.

Текущая Конфигурация Минимальна для восстановления XP событий.
