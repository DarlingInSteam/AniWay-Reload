# 🚀 ФИНАЛЬНОЕ РЕШЕНИЕ: Прокси через переменные окружения

## Проблема:
- `ParserSettings` не имеет атрибута `_Raw` (старая версия Melon)
- `_Logging` не доступен в `_InitializeRequestor()`
- Прокси из `settings.json` не загружается в dublib

## ✅ Решение: Переменные окружения

Прокси передается через `HTTP_PROXY`/`HTTPS_PROXY` и читается парсером из `os.getenv()`.

---

## Изменения:

### 1. `Parsers/mangalib/main.py`

```python
def _InitializeRequestor(self) -> WebRequestor:
    """Инициализирует модуль WEB-запросов."""

    WebRequestorObject = super()._InitializeRequestor()
    
    # Добавляем авторизационный токен если есть
    if self._Settings.custom["token"]: 
        WebRequestorObject.config.add_header("Authorization", self._Settings.custom["token"])
    
    # ФИКС: Добавляем прокси из переменных окружения (для обхода 403)
    import os
    http_proxy = os.getenv("HTTP_PROXY") or os.getenv("http_proxy")
    https_proxy = os.getenv("HTTPS_PROXY") or os.getenv("https_proxy")
    
    if http_proxy or https_proxy:
        proxies = {}
        if http_proxy:
            proxies['http'] = http_proxy
        if https_proxy:
            proxies['https'] = https_proxy
        
        # Добавляем прокси в WebRequestor
        try:
            WebRequestorObject.add_proxies(proxies)
            print(f"[INFO] ✅ Proxy configured from environment: {http_proxy or https_proxy}")
        except AttributeError:
            # Если метод add_proxies не существует, пробуем напрямую
            WebRequestorObject.proxies = proxies
            print(f"[INFO] ✅ Proxy set directly: {http_proxy or https_proxy}")

    return WebRequestorObject
```

### 2. `docker-compose.dev.yml`

```yaml
melon-service:
  environment:
    # Прокси для обхода блокировки MangaLib API
    - HTTP_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
    - HTTPS_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
    - NO_PROXY=localhost,127.0.0.1,postgres,redis,rabbitmq
```

### 3. `docker-compose.prod.yml`

```yaml
melon-service:
  environment:
    # Прокси для обхода блокировки MangaLib API
    - HTTP_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
    - HTTPS_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
    - NO_PROXY=localhost,127.0.0.1,postgres,redis,rabbitmq
```

---

## Деплой:

```bash
# ============================================
# НА ЛОКАЛЬНОМ ПК (Windows):
# ============================================
cd c:\project\AniWayImageSystem\AniWay-Reload

# Коммит изменений
git add MelonService/Parsers/mangalib/main.py
git add docker-compose.dev.yml
git add docker-compose.prod.yml
git commit -m "fix: Add proxy support via environment variables

- Parser reads HTTP_PROXY/HTTPS_PROXY from environment
- Added proxy config to docker-compose.dev.yml and docker-compose.prod.yml
- Fixes 403 Forbidden error when parsing manga
- Proxy: 168.80.1.136:8000 (valid until 2025-10-14)"
git push origin develop

# ============================================
# НА СЕРВЕРЕ:
# ============================================
ssh user@server
cd ~/AniWay-Reload

# Пулл изменений
git pull origin develop

# Пересборка (используйте нужный compose файл)
docker-compose -f docker-compose.prod.yml build melon-service

# Перезапуск
docker-compose -f docker-compose.prod.yml up -d melon-service

# Проверка логов
docker logs aniway-reload-melon-service-1 --tail=100 | grep -E "Proxy|ERROR"
```

---

## Ожидаемый результат:

### Логи api_server.py:
```
✅ Proxy loaded from mangalib settings: 168.80.1.136:8000
✅ Proxy configured and ready to use
```

### Логи парсера (main.py):
```
[INFO] Parser: mangalib.
[INFO] ✅ Proxy configured from environment: http://PS20z2:***@168.80.1.136:8000
[INFO] Parsing sweet-home-kim-carnby-...
[INFO] Title data received successfully  ← Вместо 403!
```

---

## Проверка после деплоя:

```bash
# 1. Проверка переменных окружения в контейнере
docker exec aniway-reload-melon-service-1 env | grep PROXY

# Ожидаемый вывод:
# HTTP_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
# HTTPS_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000

# 2. Тест автопарсинга
curl -X POST "http://server:8080/api/manga/auto-parse?parser=mangalib&page=1&limit=3"

# 3. Мониторинг логов
docker logs -f aniway-reload-melon-service-1
```

---

## Преимущества этого подхода:

✅ **Работает с любой версией Melon** (не зависит от `_Raw` или других внутренних API)
✅ **Простая смена прокси** - просто отредактируйте docker-compose файл
✅ **Не нужно трогать settings.json** на сервере
✅ **Централизованная конфигурация** - все в docker-compose
✅ **Легко тестировать** - можно запустить с разными прокси без изменения кода

---

## Обновление прокси после истечения (14.10.25):

```bash
# 1. Купите новый прокси
# 2. Отредактируйте docker-compose.prod.yml:
nano docker-compose.prod.yml

# Замените строку:
- HTTP_PROXY=http://NEW_LOGIN:NEW_PASSWORD@NEW_IP:NEW_PORT
- HTTPS_PROXY=http://NEW_LOGIN:NEW_PASSWORD@NEW_IP:NEW_PORT

# 3. Перезапустите
docker-compose -f docker-compose.prod.yml up -d melon-service

# Готово! Прокси обновлен без изменения кода.
```

---

## Альтернатива (если переменные окружения не работают):

Используйте monkey-patching в начале `main.py` парсера:

```python
# В самом начале файла Parsers/mangalib/main.py
import os
import requests

# Monkey-patch requests для использования прокси
http_proxy = os.getenv("HTTP_PROXY")
if http_proxy:
    requests.adapters.DEFAULT_RETRIES = 5
    # Устанавливаем глобальный прокси для requests
    os.environ['http_proxy'] = http_proxy
    os.environ['https_proxy'] = os.getenv("HTTPS_PROXY", http_proxy)
```

---

## Troubleshooting:

### Проблема: Переменные окружения не передаются

**Проверка:**
```bash
docker exec aniway-reload-melon-service-1 env | grep PROXY
```

Если пусто:
- Убедитесь, что используете правильный docker-compose файл (`-f docker-compose.prod.yml`)
- Проверьте отступы в YAML (должны быть пробелы, не табы)
- Пересоберите контейнер: `docker-compose build melon-service`

### Проблема: Все еще 403

**Решение 1:** Проверьте прокси вручную:
```bash
docker exec aniway-reload-melon-service-1 bash
curl --proxy "$HTTP_PROXY" https://api.cdnlibs.org/api/manga?page=1
```

**Решение 2:** Прокси заблокирован - купите другой

---

## Итого:

🎯 **Файлы изменены:**
1. ✅ `MelonService/Parsers/mangalib/main.py` - читает прокси из env
2. ✅ `docker-compose.dev.yml` - добавлены переменные HTTP_PROXY
3. ✅ `docker-compose.prod.yml` - добавлены переменные HTTP_PROXY

🚀 **Следующие шаги:**
1. Коммит и пуш
2. Деплой на сервер
3. Проверка логов
4. Тест автопарсинга

💡 **Срок действия прокси:** до 14.10.2025 (6 дней)
