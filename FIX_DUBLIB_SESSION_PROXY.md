# Исправление ошибки 'str' object has no attribute 'to_dict' при настройке прокси

## Проблема

После настройки прокси через переменные окружения (`HTTP_PROXY`/`HTTPS_PROXY`) в логах появляется ошибка:

```
[dublib.WebRequestor] ERROR: [requests-GET] 'str' object has no attribute 'to_dict'
```

**Причина**: Старая версия `dublib` использует внутренний объект `requests.Session`, но методы `add_proxies()` или прямое присваивание `WebRequestor.proxies` не работают из-за несовместимости API.

## Решение

Нужно обращаться **напрямую к внутреннему `Session` объекту** в `WebRequestor`:

### Изменения в `MelonService/Parsers/mangalib/main.py`

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
        
        # Устанавливаем прокси напрямую в requests.Session
        # Старая версия dublib использует внутренний объект session
        try:
            # Пробуем получить доступ к внутреннему session объекту
            if hasattr(WebRequestorObject, '_WebRequestor__Session'):
                # Python name mangling для приватных атрибутов
                WebRequestorObject._WebRequestor__Session.proxies.update(proxies)
                print(f"[INFO] ✅ Proxy configured via Session (private): {http_proxy or https_proxy}")
            elif hasattr(WebRequestorObject, 'session'):
                # Или публичный атрибут session
                WebRequestorObject.session.proxies.update(proxies)
                print(f"[INFO] ✅ Proxy configured via Session (public): {http_proxy or https_proxy}")
            else:
                print(f"[WARNING] ⚠️  Could not find Session object in WebRequestor")
        except Exception as e:
            print(f"[WARNING] ⚠️  Failed to configure proxy: {e}")

    return WebRequestorObject
```

## Объяснение

### Python Name Mangling

В Python приватные атрибуты класса (начинающиеся с `__`) автоматически переименовываются:

```python
class WebRequestor:
    def __init__(self):
        self.__Session = requests.Session()  # Приватный атрибут
```

Внутри класса можно обращаться как `self.__Session`, но **извне** нужно использовать `_ClassName__AttributeName`:

```python
WebRequestorObject._WebRequestor__Session  # ← Правильный доступ извне
```

### Попытки конфигурации

Код пробует 2 способа:

1. **Приватный атрибут** (`_WebRequestor__Session`) - старая версия dublib
2. **Публичный атрибут** (`session`) - новая версия dublib

Если оба варианта не найдены, печатается предупреждение.

### Обновление прокси

Вместо замены всего словаря `proxies`, используем `.update()`:

```python
session.proxies.update({'http': '...', 'https': '...'})
```

Это **добавляет** прокси к существующим настройкам, не затирая другие конфигурации.

## Деплой на сервер

### 1. Коммит и пуш изменений

```bash
# На локальной машине (Windows)
cd C:\project\AniWayImageSystem\AniWay-Reload
git add MelonService/Parsers/mangalib/main.py
git commit -m "fix: dublib Session proxy configuration for old version"
git push origin develop
```

### 2. Обновление на сервере

```bash
# На сервере (SSH)
cd ~/AniWay-Reload

# Если есть uncommitted changes в docker-compose.prod.yml
git stash push -m "Production proxy credentials"
git pull origin develop
git stash pop

# Если конфликты - решить вручную
# nano docker-compose.prod.yml  # Убрать <<<<<<, ======, >>>>>>
# git add docker-compose.prod.yml
# git stash drop
```

### 3. Пересборка и перезапуск

```bash
# Остановить старый контейнер
docker-compose -f docker-compose.prod.yml down melon-service

# Пересобрать образ с новым кодом
docker-compose -f docker-compose.prod.yml build melon-service

# Запустить контейнер
docker-compose -f docker-compose.prod.yml up -d melon-service

# Проверить переменные окружения
docker exec aniway-reload-melon-service-1 env | grep PROXY

# Ожидаемый вывод:
# HTTP_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
# HTTPS_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
# NO_PROXY=localhost,127.0.0.1,postgres,redis,rabbitmq
```

### 4. Проверка логов

```bash
# Смотрим логи в реальном времени
docker logs -f aniway-reload-melon-service-1

# Ищем подтверждение прокси
# Должны увидеть:
# [INFO] ✅ Proxy configured via Session (private): http://PS20z2:fFNHVg@168.80.1.136:8000
```

## Тестирование

### 1. Проверка API сервера

```bash
curl -X GET "http://YOUR_SERVER:8080/api/melon/catalog/1?parser=mangalib&limit=10"
```

**Ожидаемый результат**: HTTP 200 OK, список манги

### 2. Тестирование парсинга

```bash
curl -X POST "http://YOUR_SERVER:8080/api/manga/auto-parse?parser=mangalib&page=1&limit=3"
```

**Ожидаемые логи**:
```
[INFO] ✅ Proxy configured via Session (private): http://PS20z2:fFNHVg@168.80.1.136:8000
Parsing sweet-home-kim-carnby-...
Successfully parsed title data
```

**НЕ должно быть**:
- ❌ `Response code: 403`
- ❌ `'str' object has no attribute 'to_dict'`

## Проверка версии dublib

Чтобы узнать, какой атрибут использует ваша версия:

```bash
docker exec -it aniway-reload-melon-service-1 python3 -c "
from dublib.WebRequestor import WebRequestor
w = WebRequestor()
print('Private __Session:', hasattr(w, '_WebRequestor__Session'))
print('Public session:', hasattr(w, 'session'))
if hasattr(w, '_WebRequestor__Session'):
    print('Type:', type(w._WebRequestor__Session))
"
```

## Возможные ошибки

### Ошибка 1: `Could not find Session object in WebRequestor`

**Причина**: dublib использует другое имя для Session объекта

**Решение**: Проверить исходный код dublib:
```bash
docker exec -it aniway-reload-melon-service-1 python3 -c "
from dublib.WebRequestor import WebRequestor
import inspect
print(inspect.getsource(WebRequestor.__init__))
"
```

### Ошибка 2: Прокси все еще не работает (403)

**Причина**: Прокси не применился к Session

**Отладка**:
```python
# Добавить в main.py после настройки прокси
print(f"[DEBUG] Session proxies: {WebRequestorObject._WebRequestor__Session.proxies}")
```

**Ожидаемый вывод**:
```
[DEBUG] Session proxies: {'http': 'http://PS20z2:fFNHVg@168.80.1.136:8000', 'https': 'http://PS20z2:fFNHVg@168.80.1.136:8000'}
```

### Ошибка 3: `407 Proxy Authentication Required`

**Причина**: Неправильный формат прокси URL

**Проверка**:
```bash
# Формат ДОЛЖЕН быть:
HTTP_PROXY=http://LOGIN:PASSWORD@HOST:PORT
# НЕ:
HTTP_PROXY=LOGIN:PASSWORD@HOST:PORT  # ❌ Без протокола
HTTP_PROXY=https://LOGIN:PASSWORD@HOST:PORT  # ❌ HTTPS вместо HTTP
```

## Альтернативное решение

Если прямой доступ к Session не работает, можно **монкей-патчить** метод `get` в WebRequestor:

```python
def _InitializeRequestor(self) -> WebRequestor:
    WebRequestorObject = super()._InitializeRequestor()
    
    if self._Settings.custom["token"]: 
        WebRequestorObject.config.add_header("Authorization", self._Settings.custom["token"])
    
    import os
    http_proxy = os.getenv("HTTP_PROXY") or os.getenv("http_proxy")
    
    if http_proxy:
        # Сохраняем оригинальный метод
        original_get = WebRequestorObject.get
        
        # Создаем wrapper с прокси
        def get_with_proxy(*args, **kwargs):
            kwargs.setdefault('proxies', {
                'http': http_proxy,
                'https': http_proxy
            })
            return original_get(*args, **kwargs)
        
        # Подменяем метод
        WebRequestorObject.get = get_with_proxy
        print(f"[INFO] ✅ Proxy monkey-patched: {http_proxy}")
    
    return WebRequestorObject
```

**Плюсы**: Работает на любой версии dublib  
**Минусы**: Менее элегантно, нужно патчить все методы (get, post, etc.)

## Мониторинг после деплоя

После успешного деплоя проверить:

1. **Автопарсинг без ошибок**:
   - Импортировать 10-20 манги
   - Проверить, что все парсятся без 403

2. **Логи без ошибок**:
   - `docker logs aniway-reload-melon-service-1 | grep ERROR`
   - Не должно быть `'str' object has no attribute 'to_dict'`

3. **Прокси работает**:
   - В логах есть `✅ Proxy configured via Session`
   - Запросы к MangaLib возвращают 200 OK

4. **Срок действия прокси**:
   - Действителен до: 14.10.2025 (осталось 6 дней)
   - Установить напоминание на 13.10.2025 для обновления

---

## Итоговая структура изменений

```
MelonService/
├── Parsers/
│   └── mangalib/
│       ├── main.py  ← ИЗМЕНЕН (Session proxy)
│       └── settings.json  ← Настройки прокси
├── api_server.py  ← Прокси для catalog endpoint
└── requirements.txt

docker-compose.prod.yml  ← HTTP_PROXY, HTTPS_PROXY
docker-compose.dev.yml   ← HTTP_PROXY, HTTPS_PROXY
```

**Версия фикса**: 3 (Session direct access)  
**Дата**: 07.10.2025  
**Причина**: dublib старая версия не поддерживает add_proxies()
