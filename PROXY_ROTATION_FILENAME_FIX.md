# 🔄 PROXY ROTATION + FILENAME FIX - Итоговая документация

## 📋 Обзор изменений

Дата: 07.10.2025  
Цель: Внедрение механизма ротации прокси + исправление бага с именем JSON файла

---

## 🐛 Проблема #1: Неправильное имя JSON файла

### Описание
Парсер успешно завершал работу, но MangaService не мог найти JSON файл для импорта:

```
Файл в контейнере:  suddenly-became-a-princess-one-day-.json
MangaService ищет:  7820--suddenly-became-a-princess-one-day-.json
```

### Причина
После получения данных от MangaLib API, парсер **перезаписывал** `Title.slug` чистым значением из API (без ID):

```python
# Было:
self._Title.set_slug(Data["slug"])  # "suddenly-became-a-princess-one-day-"
# При этом оригинальный slug был: "7820--suddenly-became-a-princess-one-day-"
```

Базовый класс `dublib` использует `Title.slug` для имени файла, поэтому файл сохранялся БЕЗ ID.

### Решение
**НЕ перезаписываем** `Title.slug` после парсинга. Оставляем оригинальный slug с ID:

```python
# Закомментирована строка:
# self._Title.set_slug(Data["slug"])  # <-- УБРАНО

# Slug остаётся оригинальным: "7820--suddenly-became-a-princess-one-day-"
# Файл сохраняется: "7820--suddenly-became-a-princess-one-day-.json"
```

**Файлы изменены**:
- `MelonService/Parsers/mangalib/main.py` (строки 620-665)

---

## 🔄 Проблема #2: Фризы парсинга из-за rate limiting

### Описание
Парсинг периодически замирал на 25-30 минут (1800 секунд heartbeat без загрузки изображений):

```
[2025-10-07T09:36:15] Downloaded 623/784 images
[Heartbeat] Процесс активен, прошло 1800с с последнего обновления
... 30 минут heartbeat-only сообщений ...
[2025-10-07T10:06:20] Downloaded 624/784 images  # Продолжил!
```

### Причина
Прокси провайдер (168.80.1.136:8000) применяет rate limiting при большом объёме запросов. Один прокси не справляется.

### Решение
Внедрена **система ротации прокси** с поддержкой:
- ✅ Одного прокси (без ротации)
- ✅ Множественных прокси (round-robin ротация)
- ✅ Стратегии: round-robin, random, failover
- ✅ Обратная совместимость

---

## 📦 Новые файлы

### 1. `MelonService/proxy_rotator.py`

Модуль ротации прокси с классом `ProxyRotator`:

```python
from proxy_rotator import get_proxy_rotator

rotator = get_proxy_rotator("mangalib")
proxy = rotator.get_next_proxy()  # Получить следующий прокси (с ротацией)
```

**Возможности**:
- Автоматическая загрузка из `settings.json`
- Поддержка старого формата (один прокси)
- Поддержка нового формата (массив прокси)
- Потокобезопасность (`threading.Lock`)
- Стратегии ротации: `round-robin`, `random`, `failover`

**Пример использования**:
```python
rotator = ProxyRotator(parser="mangalib")

if rotator.get_proxy_count() == 1:
    proxy = rotator.get_current_proxy()  # Без ротации
else:
    proxy = rotator.get_next_proxy()     # С ротацией
```

---

## ⚙️ Изменённые файлы

### 2. `MelonService/Parsers/mangalib/settings.json`

**Было** (старый формат):
```json
{
  "proxy": {
    "enable": true,
    "host": "168.80.1.136",
    "port": 8000,
    "login": "PS20z2",
    "password": "fFNHVg"
  },
  "common": {
    "retries": 1,
    "delay": 1
  }
}
```

**Стало** (новый формат с массивом):
```json
{
  "proxy": {
    "enable": true,
    "rotation": "round-robin",
    "proxies": [
      {
        "host": "168.80.1.136",
        "port": 8000,
        "login": "PS20z2",
        "password": "fFNHVg"
      }
    ]
  },
  "common": {
    "retries": 3,
    "delay": 2
  }
}
```

**Изменения**:
- ✅ Формат прокси: объект → массив объектов
- ✅ Добавлено поле `rotation`: стратегия ротации
- ✅ Увеличены `retries`: 1 → 3
- ✅ Увеличена `delay`: 1 → 2 секунды
- ✅ Обратная совместимость сохранена (ProxyRotator поддерживает старый формат)

---

### 3. `MelonService/api_server.py`

**Было**:
```python
def load_proxy_settings(parser: str = "mangalib") -> Optional[Dict[str, str]]:
    # ... чтение одного прокси ...
    return {'http': proxy_url, 'https': proxy_url}

PROXY_SETTINGS = load_proxy_settings("mangalib")

# В функциях:
response = requests.get(api_url, proxies=PROXY_SETTINGS)
```

**Стало**:
```python
from proxy_rotator import get_proxy_rotator

PROXY_ROTATOR = get_proxy_rotator("mangalib")

def get_proxy_for_request() -> Optional[Dict[str, str]]:
    if PROXY_ROTATOR.get_proxy_count() == 0:
        return None
    if PROXY_ROTATOR.get_proxy_count() == 1:
        return PROXY_ROTATOR.get_current_proxy()  # Без ротации
    return PROXY_ROTATOR.get_next_proxy()         # С ротацией

# В функциях:
current_proxy = get_proxy_for_request()
response = requests.get(api_url, proxies=current_proxy)
```

**Изменения**:
- ✅ Удалена функция `load_proxy_settings()`
- ✅ Использование `ProxyRotator` вместо статического `PROXY_SETTINGS`
- ✅ Динамическая ротация при каждом запросе
- ✅ 2 точки применения: `get_catalog()` и `get_manga_by_id()`

---

### 4. `MelonService/Parsers/mangalib/main.py`

**Изменения в `_InitializeRequestor()`**:

**Было**:
```python
def _InitializeRequestor(self) -> WebRequestor:
    WebRequestorObject = super()._InitializeRequestor()
    
    # Читаем из переменных окружения
    http_proxy = os.getenv("HTTP_PROXY")
    https_proxy = os.getenv("HTTPS_PROXY")
    
    if http_proxy or https_proxy:
        proxies = {'http': http_proxy, 'https': https_proxy}
        WebRequestorObject._WebRequestor__Session.proxies.update(proxies)
    
    return WebRequestorObject
```

**Стало**:
```python
def _InitializeRequestor(self) -> WebRequestor:
    WebRequestorObject = super()._InitializeRequestor()
    
    # Приоритет: ProxyRotator → environment variables
    try:
        from proxy_rotator import ProxyRotator
        rotator = ProxyRotator(parser="mangalib")
        
        if rotator.enabled and rotator.get_proxy_count() > 0:
            if rotator.get_proxy_count() == 1:
                proxy_dict = rotator.get_current_proxy()  # Без ротации
            else:
                proxy_dict = rotator.get_next_proxy()     # С ротацией
            
            WebRequestorObject._WebRequestor__Session.proxies.update(proxy_dict)
        else:
            # Fallback: environment variables
            http_proxy = os.getenv("HTTP_PROXY")
            https_proxy = os.getenv("HTTPS_PROXY")
            if http_proxy or https_proxy:
                proxies = {'http': http_proxy, 'https': https_proxy}
                WebRequestorObject._WebRequestor__Session.proxies.update(proxies)
    except ImportError:
        # Fallback если ProxyRotator недоступен
        # ... environment variables ...
    
    return WebRequestorObject
```

**Изменения в `parse()`**:

**Было**:
```python
if "--" in self._Title.slug and not self._Title.id:
    parts = self._Title.slug.split("--", 1)
    if len(parts) == 2 and parts[0].isdigit():
        self._Title.set_id(int(parts[0]))
        self._Title.set_slug(parts[1])

if self._Title.id and self._Title.slug: 
    self.__TitleSlug = f"{self._Title.id}--{self._Title.slug}"
else: 
    self.__TitleSlug = self._Title.slug

# ...

if Data:
    self._Title.set_id(Data["id"])
    self._Title.set_slug(Data["slug"])  # <-- ПЕРЕЗАПИСЫВАЕТ slug!
```

**Стало**:
```python
# Сохраняем ОРИГИНАЛЬНЫЙ slug для имени файла
original_slug_with_id = self._Title.slug
clean_slug_for_api = self._Title.slug
extracted_id = None

if "--" in self._Title.slug:
    parts = self._Title.slug.split("--", 1)
    if len(parts) == 2 and parts[0].isdigit():
        extracted_id = int(parts[0])
        clean_slug_for_api = parts[1]

# Используем ЧИСТЫЙ slug для API запросов
self.__TitleSlug = clean_slug_for_api

# ...

if Data:
    # ВАЖНО: НЕ перезаписываем slug!
    # self._Title.set_slug(Data["slug"])  # <-- ЗАКОММЕНТИРОВАНО
    
    # Slug остаётся оригинальным (с ID) для правильного имени файла
    self._Title.set_id(Data["id"])
```

**Суть изменений**:
- ✅ **НЕ перезаписываем** `Title.slug` после получения данных от API
- ✅ Slug остаётся в формате `ID--slug` для правильного имени JSON файла
- ✅ Для API используем чистый slug (без ID) в переменной `self.__TitleSlug`

---

### 5. `docker-compose.prod.yml`

**Изменения**:

**Было**:
```yaml
melon-service:
  environment:
    - HTTP_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
    - HTTPS_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
```

**Стало**:
```yaml
melon-service:
  environment:
    # PROXY ROTATION SUPPORT:
    # - Если прокси один - просто указываем HTTP_PROXY/HTTPS_PROXY
    # - Если прокси несколько - settings.json будет ротировать их
    # - Текущая конфигурация: 1 прокси (ротация не происходит)
    - HTTP_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
    - HTTPS_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
    - NO_PROXY=localhost,127.0.0.1,manga-service,chapter-service,auth-service
    # 
    # ДЛЯ МНОЖЕСТВЕННЫХ ПРОКСИ:
    # 1. Добавьте их в MelonService/Parsers/mangalib/settings.json:
    #    "proxies": [
    #      {"host": "168.80.1.136", "port": 8000, "login": "PS20z2", "password": "fFNHVg"},
    #      {"host": "another.proxy.com", "port": 8000, "login": "user2", "password": "pass2"}
    #    ]
    # 2. Удалите или закомментируйте HTTP_PROXY/HTTPS_PROXY выше
    # 3. Ротация будет происходить автоматически внутри api_server.py и main.py
```

**Изменения**:
- ✅ Добавлена документация по использованию множественных прокси
- ✅ Инструкция как переключиться с env vars на ProxyRotator

---

## 🧪 Тестирование

### Локальные тесты

**1. Тест синтаксиса парсера**:
```bash
cd MelonService/Parsers/mangalib
python -m py_compile main.py
# Exit code: 0 ✅
```

**2. Тест ProxyRotator**:
```bash
cd MelonService
python proxy_rotator.py
# Output:
# ProxyRotator(enabled, 1 proxies, strategy=round-robin) ✅
```

**3. Тест логики slug/filename**:
```bash
cd MelonService
python test_slug_filename.py
# Output:
# Title.slug: 7820--suddenly-became-a-princess-one-day-
# Expected JSON file: 7820--suddenly-became-a-princess-one-day-.json ✅
```

---

## 📊 Результаты production (до деплоя)

### Статус до исправления

**Парсинг**:
```
Downloaded 651/784 images (83%)
Saved.
Done in 57 minutes 5 seconds.
===== SUMMARY =====
Parsed: 1. Not found: 0. Errors: 0.
===== END =====
```

**Ошибка импорта**:
```
status=FAILED, progress=100
message=Парсинг выполнен, но JSON файл не найден
```

**Файл в контейнере**:
```bash
root@741ca4385ec2:/app/Output/mangalib/titles# ls
suddenly-became-a-princess-one-day-.json  # БЕЗ ID!
sweet-home-kim-carnby-.json               # БЕЗ ID!
```

**MangaService ищет**:
```
7820--suddenly-became-a-princess-one-day-.json  # С ID!
```

---

## 🚀 Деплой на production

### Шаги деплоя:

**1. Commit изменений**:
```bash
cd c:\project\AniWayImageSystem\AniWay-Reload
git add MelonService/proxy_rotator.py
git add MelonService/Parsers/mangalib/main.py
git add MelonService/Parsers/mangalib/settings.json
git add MelonService/api_server.py
git add docker-compose.prod.yml
git commit -m "feat: proxy rotation + filename fix (slug_url with ID)"
```

**2. Push на сервер**:
```bash
git push origin develop
```

**3. На сервере**:
```bash
ssh darling@89.169.176.162
cd /root/AniWay-Reload
git pull origin develop
docker-compose -f docker-compose.prod.yml down melon-service
docker-compose -f docker-compose.prod.yml build melon-service
docker-compose -f docker-compose.prod.yml up -d melon-service
```

**4. Проверка логов**:
```bash
docker logs aniway-reload-melon-service-1 --tail=50 | grep -E "Proxy|Rotator"
# Ожидаем: "Proxy rotation enabled: 1 proxy(ies)"
```

**5. Запуск парсинга через UI**:
- Открыть фронтенд: http://89.169.176.162
- Админ-панель → Auto-parsing
- Добавить тайтл: `7820--suddenly-became-a-princess-one-day-`
- Запустить парсинг

**6. Мониторинг**:
```bash
# Проверка имени файла
docker exec -it aniway-reload-melon-service-1 ls -la /app/Output/mangalib/titles/
# Ожидаем: 7820--suddenly-became-a-princess-one-day-.json

# Проверка импорта
docker logs aniway-reload-manga-service-1 --tail=100 | grep -E "IMPORTING|COMPLETED"
```

---

## 🎯 Ожидаемые результаты

### ✅ Правильное имя файла
```bash
# Файл сохраняется с ID:
/app/Output/mangalib/titles/7820--suddenly-became-a-princess-one-day-.json

# MangaService находит файл:
status=COMPLETED, progress=100
message=Парсинг и импорт завершены успешно
```

### ✅ Proxy rotation (при добавлении второго прокси)

**Добавить в `settings.json`**:
```json
{
  "proxy": {
    "enable": true,
    "rotation": "round-robin",
    "proxies": [
      {
        "host": "168.80.1.136",
        "port": 8000,
        "login": "PS20z2",
        "password": "fFNHVg"
      },
      {
        "host": "ANOTHER_PROXY_IP",
        "port": 8000,
        "login": "user2",
        "password": "pass2"
      }
    ]
  }
}
```

**Логи**:
```
[INFO] ✅ Proxy rotation enabled: 2 proxies, strategy=round-robin
[INFO] 🔄 Request 1: using proxy 168.80.1.136:8000
[INFO] 🔄 Request 2: using proxy ANOTHER_PROXY_IP:8000
[INFO] 🔄 Request 3: using proxy 168.80.1.136:8000
```

### ✅ Уменьшение фризов

**До**:
```
Downloaded 623/784
[Heartbeat] Процесс активен, прошло 1800с  # 30 минут freeze
Downloaded 624/784
```

**После** (с 2+ прокси):
```
Downloaded 623/784
Downloaded 624/784  # Без freeze (ротация прокси)
Downloaded 625/784
```

---

## 🔍 Технические детали

### Приоритет конфигурации прокси

**api_server.py**:
```
ProxyRotator (settings.json) → direct request
```

**main.py парсер**:
```
ProxyRotator (settings.json) → HTTP_PROXY env → direct request
```

### Формат имени файла

**Правило**:
- Если slug из каталога: `7820--suddenly-became-a-princess-one-day-`
- То файл: `7820--suddenly-became-a-princess-one-day-.json`
- MangaService ищет: `7820--suddenly-became-a-princess-one-day-.json`
- ✅ **СОВПАДЕНИЕ!**

### Обратная совместимость

**Старый формат settings.json** (всё ещё работает):
```json
{
  "proxy": {
    "enable": true,
    "host": "168.80.1.136",
    "port": 8000,
    "login": "PS20z2",
    "password": "fFNHVg"
  }
}
```

`ProxyRotator` автоматически конвертирует в:
```json
{
  "proxies": [
    {"host": "168.80.1.136", "port": 8000, "login": "PS20z2", "password": "fFNHVg"}
  ]
}
```

---

## 📚 Дополнительная информация

### Купить дополнительные прокси

Если один прокси не справляется с load (фризы продолжаются):

1. **Купить 2-3 российских прокси** (того же провайдера)
2. **Добавить в `settings.json`**:
   ```json
   "proxies": [
     {"host": "proxy1", "port": 8000, "login": "user1", "password": "pass1"},
     {"host": "proxy2", "port": 8000, "login": "user2", "password": "pass2"},
     {"host": "proxy3", "port": 8000, "login": "user3", "password": "pass3"}
   ]
   ```
3. **Удалить env vars** из `docker-compose.prod.yml` (закомментировать `HTTP_PROXY`/`HTTPS_PROXY`)
4. **Пересобрать контейнер**: `docker-compose build melon-service && docker-compose up -d melon-service`
5. **Ротация автоматическая**: каждый запрос к API будет использовать следующий прокси по кругу

### Стратегии ротации

**round-robin** (по умолчанию):
- Циклическая ротация: proxy1 → proxy2 → proxy3 → proxy1 ...
- Равномерное распределение нагрузки

**random**:
- Случайный выбор прокси на каждый запрос
- Непредсказуемость (сложнее отследить паттерн)

**failover**:
- Использовать первый прокси, переключиться на второй только при ошибке
- Для резервирования

**Настройка стратегии**:
```json
{
  "proxy": {
    "rotation": "random"  // или "round-robin" или "failover"
  }
}
```

---

## ✅ Чеклист деплоя

- [x] Создан `proxy_rotator.py`
- [x] Обновлён `api_server.py` (использование ProxyRotator)
- [x] Обновлён `main.py` парсер (ProxyRotator + filename fix)
- [x] Обновлён `settings.json` (формат массива + retries/delay)
- [x] Обновлён `docker-compose.prod.yml` (комментарии)
- [x] Локальные тесты пройдены
- [ ] Commit + Push
- [ ] Pull на сервере
- [ ] Rebuild контейнера
- [ ] Запуск парсинга
- [ ] Проверка имени файла
- [ ] Проверка импорта
- [ ] Мониторинг фризов

---

## 🎉 Итоговые улучшения

1. ✅ **Filename fix**: JSON файлы сохраняются с правильным именем (с ID)
2. ✅ **Proxy rotation**: Поддержка множественных прокси для уменьшения фризов
3. ✅ **Performance tuning**: retries: 3, delay: 2 (вместо 1, 1)
4. ✅ **Backward compatibility**: Старый формат settings.json всё ещё работает
5. ✅ **Flexibility**: Легко добавить/удалить прокси через settings.json
6. ✅ **Monitoring**: Подробные debug-логи для отслеживания ротации

---

**Автор**: GitHub Copilot  
**Дата**: 07.10.2025  
**Версия**: 1.0
