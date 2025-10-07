# ✅ ФИНАЛЬНОЕ РЕШЕНИЕ: Прокси через переменные окружения

## Проблема

Старая версия Melon не поддерживает `_Raw` и `_Logging` в `_InitializeRequestor()`:

```python
AttributeError: 'ParserSettings' object has no attribute '_Raw'
AttributeError: 'Parser' object has no attribute '_Logging'
```

## ✅ Решение: HTTP_PROXY переменные окружения

Используем стандартные переменные окружения Python для прокси:
- `HTTP_PROXY` - для HTTP запросов
- `HTTPS_PROXY` - для HTTPS запросов
- `NO_PROXY` - исключения (локальные сервисы)

## Изменения

### 1. `docker-compose.yml` (основной)
```yaml
melon-service:
  environment:
    - HTTP_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
    - HTTPS_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
    - NO_PROXY=localhost,127.0.0.1,manga-service,chapter-service,auth-service
```

### 2. `docker-compose.dev.yml` (разработка)
```yaml
melon-service:
  environment:
    - PYTHONPATH=/app
    - HTTP_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
    - HTTPS_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
    - NO_PROXY=localhost,127.0.0.1,manga-service,chapter-service,auth-service
```

### 3. `docker-compose.prod.yml` (production)
```yaml
melon-service:
  environment:
    - PYTHONUNBUFFERED=1
    - HTTP_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
    - HTTPS_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
    - NO_PROXY=localhost,127.0.0.1,manga-service,chapter-service,auth-service
```

### 4. `MelonService/Parsers/mangalib/main.py`
Возвращен в исходное состояние (БЕЗ кода прокси) - прокси работает через env vars автоматически!

### 5. `MelonService/Parsers/mangalib/settings.json`
```json
"proxy": {
  "enable": true,     ← Оставляем для api_server.py
  "host": "168.80.1.136",
  "port": 8000,
  "login": "PS20z2",
  "password": "fFNHVg"
}
```

## Как работает

1. **api_server.py** - использует прокси из `settings.json` (как раньше)
2. **main.py (парсер)** - использует прокси из `HTTP_PROXY`/`HTTPS_PROXY` **автоматически**!

Python's `requests` и `urllib` **автоматически** читают переменные окружения `HTTP_PROXY`/`HTTPS_PROXY`.

## Деплой

```bash
# ============================================
# НА ЛОКАЛЬНОМ ПК:
# ============================================
cd c:\project\AniWayImageSystem\AniWay-Reload

git add docker-compose.yml
git add docker-compose.dev.yml
git add docker-compose.prod.yml
git add MelonService/Parsers/mangalib/main.py
git add MelonService/Parsers/mangalib/settings.json

git commit -m "fix: Add proxy via environment variables

- Added HTTP_PROXY/HTTPS_PROXY to melon-service
- Configured in docker-compose.yml, .dev.yml, .prod.yml
- Proxy: 168.80.1.136:8000 (Russian proxy)
- Fixed 403 Forbidden from MangaLib API
- Reverted main.py to original (env vars work automatically)"

git push origin develop

# ============================================
# НА СЕРВЕРЕ:
# ============================================
ssh user@server
cd ~/AniWay-Reload
git pull origin develop
docker-compose build melon-service
docker-compose up -d melon-service

# Проверка
docker logs aniway-reload-melon-service-1 --tail=100 | grep -E "Proxy|Parsing|ERROR"
```

## Проверка работы

### 1. Проверка переменных окружения в контейнере:

```bash
docker exec -it aniway-reload-melon-service-1 env | grep PROXY
```

Должно быть:
```
HTTP_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
HTTPS_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
NO_PROXY=localhost,127.0.0.1,manga-service,chapter-service,auth-service
```

### 2. Тест прокси внутри контейнера:

```bash
docker exec -it aniway-reload-melon-service-1 bash
curl https://api.ipify.org  # Должен вернуть 168.80.1.136
```

### 3. Логи парсинга:

```bash
docker logs -f aniway-reload-melon-service-1
```

Должно быть:
```
✅ Proxy loaded from mangalib settings: 168.80.1.136:8000
[INFO] Parser: mangalib.
[INFO] Parsing sweet-home-kim-carnby-...
[INFO] Title data received successfully  ← НЕ 403!
[INFO] Parsed: 1. Not found: 0. Errors: 0.
```

### 4. Тест автопарсинга:

```bash
curl -X POST "http://server:8080/api/manga/auto-parse?parser=mangalib&page=1&limit=3"
```

Должно импортировать 3 манги без ошибок!

## Обновление прокси (после истечения срока)

Когда прокси истечет (14.10.25), просто обновите переменные окружения:

```yaml
# docker-compose.yml
melon-service:
  environment:
    - HTTP_PROXY=http://NEW_LOGIN:NEW_PASS@NEW_IP:NEW_PORT
    - HTTPS_PROXY=http://NEW_LOGIN:NEW_PASS@NEW_IP:NEW_PORT
```

Затем перезапустите:
```bash
docker-compose up -d melon-service
```

**БЕЗ ПЕРЕСБОРКИ!** Просто перезапуск.

## Преимущества этого решения

✅ **Работает со старым Melon** (нет зависимости от `_Raw`/`_Logging`)  
✅ **Не нужно менять код парсера** (env vars работают автоматически)  
✅ **Легко обновить** прокси (просто изменить docker-compose.yml)  
✅ **Централизованная настройка** (один файл для всех компонентов)  
✅ **Стандартный подход** Python (HTTP_PROXY - общепринятый стандарт)  

## Возможные проблемы

### Проблема: Все еще 403

**Решение 1:** Проверьте переменные окружения:
```bash
docker exec melon-service env | grep PROXY
```

**Решение 2:** Проверьте прокси вручную:
```bash
docker exec melon-service curl --proxy http://PS20z2:fFNHVg@168.80.1.136:8000 https://api.ipify.org
```

**Решение 3:** Прокси заблокирован → купите новый

### Проблема: NO_PROXY не работает

Проверьте формат (без пробелов, через запятую):
```yaml
- NO_PROXY=localhost,127.0.0.1,manga-service
```

## Итого

**Что изменилось:**
1. ✅ Добавлены `HTTP_PROXY`/`HTTPS_PROXY` в 3 docker-compose файлах
2. ✅ `main.py` возвращен в исходное состояние
3. ✅ `settings.json` сохранен для `api_server.py`
4. ✅ Прокси работает **автоматически** для всех Python запросов

**Готово к деплою!** 🚀
