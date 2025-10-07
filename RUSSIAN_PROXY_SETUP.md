# Настройка российского прокси для MelonService

## ✅ ПРОКСИ НАСТРОЕН И РАБОТАЕТ!

### Данные прокси:
- **IP:** 168.80.1.136
- **Порт:** 8000
- **Логин:** PS20z2
- **Пароль:** fFNHVg
- **Срок действия:** до 14.10.25 (6 дней)

### Результаты локального теста:

```bash
🧪 ТЕСТ РОССИЙСКОГО ПРОКСИ ДЛЯ MANGALIB API
✅ Proxy configured: PS20z2:***@168.80.1.136:8000
✅ IP через прокси: 168.80.1.136
✅ MangaLib API: 200 OK - получено 60 манг
```

## Конфигурация

### settings.json
Файл: `MelonService/Parsers/mangalib/settings.json`

```json
"proxy": {
  "enable": true,
  "host": "168.80.1.136",
  "port": "8000",
  "login": "PS20z2",
  "password": "fFNHVg"
}
```

## Деплой на сервер

### Вариант 1: Через Git (РЕКОМЕНДУЕТСЯ)

```bash
# На локальном компьютере
cd c:\project\AniWayImageSystem\AniWay-Reload
git add MelonService/Parsers/mangalib/settings.json
git add MelonService/api_server.py
git add MelonService/requirements.txt
git commit -m "feat: Add Russian proxy support for MangaLib API

- Configure proxy in settings.json (168.80.1.136:8000)
- Update api_server.py to load proxy from settings.json
- Add pysocks to requirements.txt for SOCKS5 support
- Fix 403 Forbidden error from MangaLib API via proxy"
git push origin develop
```

```bash
# На сервере
cd /path/to/AniWay-Reload
git pull origin develop

# Пересобрать MelonService
docker-compose build melon-service

# Перезапустить
docker-compose up -d melon-service

# Проверить логи
docker logs aniway-reload-melon-service-1 --tail=50
```

### Вариант 2: Ручное редактирование на сервере

```bash
# На сервере
cd /path/to/AniWay-Reload/MelonService
nano Parsers/mangalib/settings.json

# Изменить секцию "proxy":
"proxy": {
  "enable": true,
  "host": "168.80.1.136",
  "port": "8000",
  "login": "PS20z2",
  "password": "fFNHVg"
}

# Сохранить (Ctrl+O, Enter, Ctrl+X)

# Пересобрать и перезапустить
docker-compose build melon-service
docker-compose up -d melon-service
```

## Проверка работы на сервере

### 1. Проверка логов при запуске

```bash
docker logs aniway-reload-melon-service-1 --tail=100
```

Должно быть:
```
✅ Proxy loaded from mangalib settings: 168.80.1.136:8000
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8090
```

### 2. Тест API через прокси

```bash
# Внутри контейнера
docker exec -it aniway-reload-melon-service-1 bash
cd /app
python test_proxy.py

# Должно быть:
# ✅ IP через прокси: 168.80.1.136
# ✅ MangaLib API: 200 OK
```

### 3. Тест автопарсинга

```bash
# Через MangaService API
curl -X POST "http://your-server:8080/api/manga/auto-parse?parser=mangalib&page=1&limit=5"
```

Должно успешно импортировать 5 манг без 403 ошибок.

## Мониторинг

### Проверка логов в реальном времени

```bash
docker logs -f aniway-reload-melon-service-1
```

### Проверка статистики прокси

Если прокси работает, в логах НЕ должно быть:
- ❌ `403 Forbidden`
- ❌ `Client Error`
- ❌ `IP blocked`

Должно быть:
- ✅ `200 OK`
- ✅ `Successfully parsed manga`
- ✅ `Task completed`

## Важные замечания

### 🔔 Срок действия прокси: до 14.10.25 (6 дней)

После истечения срока нужно будет:
1. Продлить прокси или купить новый
2. Обновить данные в `settings.json`
3. Перезапустить MelonService

### 🔒 Безопасность

**ВАЖНО:** В файле `settings.json` хранятся логин и пароль в открытом виде!

Если репозиторий публичный или есть доступ у посторонних:

1. **НЕ коммитьте settings.json с паролями в Git:**

```bash
# Добавьте в .gitignore
echo "MelonService/Parsers/mangalib/settings.json" >> .gitignore

# Создайте шаблон без паролей
cp MelonService/Parsers/mangalib/settings.json \
   MelonService/Parsers/mangalib/settings.json.example

# Очистите пароли в example файле
# Настоящий settings.json настройте вручную на сервере
```

2. **Используйте переменные окружения (альтернатива):**

Можно доработать `api_server.py` для чтения из переменных окружения:

```python
import os

proxy_config = {
    "enable": os.getenv("PROXY_ENABLE", "false").lower() == "true",
    "host": os.getenv("PROXY_HOST", settings["proxy"]["host"]),
    "port": os.getenv("PROXY_PORT", settings["proxy"]["port"]),
    "login": os.getenv("PROXY_LOGIN", settings["proxy"]["login"]),
    "password": os.getenv("PROXY_PASSWORD", settings["proxy"]["password"])
}
```

Затем в `docker-compose.yml`:

```yaml
melon-service:
  environment:
    - PROXY_ENABLE=true
    - PROXY_HOST=168.80.1.136
    - PROXY_PORT=8000
    - PROXY_LOGIN=PS20z2
    - PROXY_PASSWORD=fFNHVg
```

## Альтернативные прокси (для следующей покупки)

### Рекомендации:

1. **Мобильные прокси (лучше всего для обхода блокировок):**
   - proxy-sale.com - от 500₽/месяц
   - proxy6.net - от 300₽/месяц
   - youproxy.ru - от 250₽/месяц

2. **Резидентные прокси (дороже, но надежнее):**
   - proxy-cheap.com - от $3/GB
   - smartproxy.com - от $8.5/GB

3. **Датацентр прокси (самые дешевые):**
   - proxy-seller.ru - от 50₽/месяц
   - proxys.io - от $1/месяц

**Совет:** Для MangaLib достаточно обычных российских HTTP прокси (50-300₽/месяц).

## Устранение неполадок

### Проблема: 403 Forbidden даже с прокси

**Решение:**
- Убедитесь, что прокси включен: `"enable": true`
- Проверьте срок действия прокси (14.10.25)
- Проверьте, что прокси сам по себе работает: `curl --proxy http://PS20z2:fFNHVg@168.80.1.136:8000 https://api.ipify.org`

### Проблема: Proxy authentication required

**Решение:**
- Проверьте логин и пароль в settings.json
- Убедитесь, что нет лишних пробелов
- Попробуйте обновить пароль у провайдера прокси

### Проблема: Timeout

**Решение:**
- Прокси может быть перегружен или медленный
- Увеличьте timeout в `api_server.py`: `timeout=60`
- Попробуйте другой прокси

### Проблема: Connection refused

**Решение:**
- Прокси сервер недоступен
- Проверьте IP и порт
- Убедитесь, что срок действия не истек

## Итог

✅ **Прокси настроен и протестирован**
✅ **MangaLib API доступен (200 OK)**
✅ **Готов к деплою на сервер**

Теперь нужно:
1. Закоммитить изменения в Git
2. Задеплоить на сервер
3. Протестировать автопарсинг

После истечения срока (14.10.25) - продлить или купить новый прокси.
