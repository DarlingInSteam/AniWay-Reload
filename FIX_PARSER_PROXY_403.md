# ФИКС: Парсер не использует прокси (403 ошибка)

## Проблема

API сервер (`api_server.py`) использует прокси ✅, но парсер (`main.py`) получает 403:

```
✅ 2025-10-07 08:35:21 - Successfully fetched 60 manga slugs
   ↑ api_server.py с прокси

❌ [2025-10-07T08:35:22.505723] [ERROR] Unable to request title data. Response code: 403.
   ↑ main.py БЕЗ прокси
```

##Root Cause

`dublib.WebRequestor` в парсере **НЕ загружал прокси** из `settings.json` автоматически.

## Решение

Добавлена **явная настройка прокси** в `_InitializeRequestor()` парсера через `_Raw` словарь настроек:

### Изменения в `Parsers/mangalib/main.py`:

```python
def _InitializeRequestor(self) -> WebRequestor:
    """Инициализирует модуль WEB-запросов."""

    WebRequestorObject = super()._InitializeRequestor()
    
    # Добавляем авторизационный токен если есть
    if self._Settings.custom["token"]: 
        WebRequestorObject.config.add_header("Authorization", self._Settings.custom["token"])
    
    # ЯВНО добавляем прокси из settings.json (ФИКС для 403 ошибки)
    # Используем доступ через словарь, т.к. ParserSettings не имеет атрибута proxy
    try:
        # Пытаемся получить настройки прокси через raw settings dict
        proxy_settings = self._Settings._Raw.get("proxy", {})
        
        if proxy_settings.get("enable", False):
            proxy_host = proxy_settings.get("host", "")
            proxy_port = proxy_settings.get("port", "")
            proxy_login = proxy_settings.get("login", "")
            proxy_password = proxy_settings.get("password", "")
            
            if not proxy_host or not proxy_port:
                self._Logging.warning("⚠️  Proxy enabled but host/port not configured")
            else:
                # Формируем прокси в формате для requests
                if proxy_login and proxy_password:
                    proxy_url = f"http://{proxy_login}:{proxy_password}@{proxy_host}:{proxy_port}"
                else:
                    proxy_url = f"http://{proxy_host}:{proxy_port}"
                
                # Добавляем прокси в WebRequestor
                WebRequestorObject.add_proxies({'http': proxy_url, 'https': proxy_url})
                
                # Логируем использование прокси
                self._Logging.info(f"✅ Proxy configured: {proxy_host}:{proxy_port}")
    except Exception as e:
        self._Logging.warning(f"⚠️  Failed to configure proxy: {e}")

    return WebRequestorObject
```

**КЛЮЧЕВОЕ ИЗМЕНЕНИЕ:** Используем `self._Settings._Raw.get("proxy", {})` вместо `self._Settings.proxy`, 
потому что `ParserSettings` не создает атрибут `proxy` автоматически.

### Изменения в `Parsers/mangalib/settings.json`:

**ВАЖНО:** `port` должен быть **числом** (int), а не строкой!

```json
"proxy": {
  "enable": true,
  "host": "168.80.1.136",
  "port": 8000,          ← Число, не "8000"!
  "login": "PS20z2",
  "password": "fFNHVg"
}
```

## Деплой на сервер

```bash
# 1. Коммит изменений
git add MelonService/Parsers/mangalib/main.py
git add MelonService/Parsers/mangalib/settings.json
git commit -m "fix: Add explicit proxy support in mangalib parser

- Parser now explicitly loads proxy from settings.json
- Fixed 403 Forbidden error when parsing manga
- Added proxy logging in parser
- Fixed port type (int vs string)"
git push origin develop

# 2. На сервере
ssh user@server
cd /path/to/AniWay-Reload
git pull origin develop

# 3. Пересобрать контейнер
docker-compose build melon-service

# 4. Перезапустить
docker-compose up -d melon-service

# 5. Проверить логи
docker logs aniway-reload-melon-service-1 --tail=100 | grep -i proxy
```

Должно быть:
```
✅ Proxy loaded from mangalib settings: 168.80.1.136:8000
✅ Proxy configured: 168.80.1.136:8000  ← НОВОЕ! Из парсера
```

## Проверка работы

### 1. Логи при парсинге:

```bash
docker logs -f aniway-reload-melon-service-1
```

Должно быть:
```
[INFO] Parser: mangalib.
[INFO] ✅ Proxy configured: 168.80.1.136:8000  ← НОВОЕ!
[INFO] Parsing sweet-home-kim-carnby-...
[INFO] Title data received successfully       ← Вместо 403!
```

### 2. Тест автопарсинга:

```bash
curl -X POST "http://server:8080/api/manga/auto-parse?parser=mangalib&page=1&limit=3"
```

Должно:
- ✅ Импортировать 3 манги
- ❌ НЕ должно быть 403 ошибок
- ✅ Логи показывают "✅ Proxy configured"

## Возможные проблемы

### Проблема: Все еще 403

**Причина 1:** Прокси IP тоже заблокирован MangaLib

**Решение:**
```bash
# Проверьте прокси вручную
docker exec -it aniway-reload-melon-service-1 bash
curl --proxy http://PS20z2:fFNHVg@168.80.1.136:8000 \
  -H "Site-Id: 1" \
  "https://api.cdnlibs.org/api/manga?page=1"
  
# Если 403 → прокси тоже заблокирован, купите другой
# Если 200 → проблема в коде
```

**Причина 2:** `dublib.WebRequestor.add_proxies()` не поддерживается

**Решение:** Проверьте версию dublib:
```bash
docker exec -it aniway-reload-melon-service-1 pip show dublib
```

Если метод `add_proxies` не существует, попробуйте:
```python
WebRequestorObject.proxies = {'http': proxy_url, 'https': proxy_url}
```

### Проблема: AttributeError: 'ParserSettings' object has no attribute 'proxy'

**Причина:** `dublib.ParserSettings` не создает атрибут `proxy` автоматически из `settings.json`

**Решение:** ✅ УЖЕ ИСПРАВЛЕНО! Используется `self._Settings._Raw.get("proxy", {})`

Если ошибка сохраняется, проверьте версию Melon:
```bash
docker exec -it aniway-reload-melon-service-1 cat /app/Source/Core/Base/ParserSettings.py | grep _Raw
```

Если `_Raw` не существует, используйте альтернативный метод (переменные окружения).

## Альтернативное решение (если не сработает)

Использовать переменные окружения для прокси:

```yaml
# docker-compose.yml
melon-service:
  environment:
    - HTTP_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
    - HTTPS_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
```

Это установит прокси **глобально** для всех Python запросов в контейнере.

## Итого

**Что изменилось:**
1. ✅ `port` изменен с `"8000"` (string) на `8000` (int)
2. ✅ Добавлена явная настройка прокси в `_InitializeRequestor()`
3. ✅ Добавлено логирование прокси в парсере

**Ожидаемый результат:**
- ✅ Парсер использует прокси
- ✅ Нет 403 ошибок
- ✅ Автопарсинг работает

**След действие:**
- Деплой на сервер
- Тестирование
- Мониторинг логов
