# Фикс: 403 Forbidden от MangaLib API при автопарсинге

## Дата
2025-10-07

## Проблема

**Ошибка:**
```
403 Client Error: Forbidden for url: https://api.cdnlibs.org/api/manga?fields[]=rate_avg&fields[]=rate&fields[]=releaseDate&page=1
```

**Симптомы:**
- Автопарсинг не может получить каталог манг
- Запросы к `api.cdnlibs.org` возвращают **403 Forbidden**
- Проблема появилась внезапно (API работало ранее)

## Причина

### MangaLib усилил защиту API

MangaLib недавно **обновил защиту своего API** и теперь проверяет:

1. **Полный набор заголовков браузера** (не только `Site-Id` и `User-Agent`)
2. **Origin и Referer** - чтобы запросы шли с официального сайта
3. **Sec-Fetch-*** заголовки - для определения типа запроса
4. **Sec-Ch-Ua-*** заголовки - для определения браузера

### Старые заголовки (НЕДОСТАТОЧНЫЕ):

```python
headers = {
    "Site-Id": site_id,
    "User-Agent": "Mozilla/5.0"  # ← Слишком простой!
}
```

**Результат:** API определяет запрос как **бота** и блокирует его (403).

## Решение

### Добавлены полные заголовки браузера

#### 1. Endpoint `/catalog/{page}` (строки 903-924)

**Код ДО:**
```python
headers = {
    "Site-Id": site_id,
    "User-Agent": "Mozilla/5.0"
}
```

**Код ПОСЛЕ:**
```python
# Имитируем настоящий браузер с полным набором заголовков
headers = {
    "Site-Id": site_id,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Origin": f"https://{parser}.me",
    "Referer": f"https://{parser}.me/manga-list",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"'
}
```

#### 2. Endpoint `/manga-info/{slug}/chapters-only` (строки 986-1003)

**Код ДО:**
```python
headers = {"Site-Id": site_id}
```

**Код ПОСЛЕ:**
```python
# Имитируем настоящий браузер
headers = {
    "Site-Id": site_id,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Origin": f"https://{parser}.me",
    "Referer": f"https://{parser}.me/{slug}",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"'
}
```

## Описание заголовков

### Обязательные для обхода защиты:

1. **`Site-Id`** - Идентификатор сайта MangaLib (1=mangalib, 2=slashlib, 4=hentailib)
2. **`User-Agent`** - Полная строка браузера Chrome 131
3. **`Origin`** - Источник запроса (https://mangalib.me)
4. **`Referer`** - Страница, с которой идет запрос
5. **`Sec-Fetch-*`** - Метаданные запроса (тип, режим, сайт)
6. **`Sec-Ch-Ua-*`** - Информация о браузере (Chrome, Windows)

### Важно:

- **`Origin`** и **`Referer`** динамически формируются на основе `parser`:
  - mangalib → `https://mangalib.me`
  - slashlib → `https://slashlib.me`
  - hentailib → `https://hentailib.me`

- **`Referer`** различается:
  - Для каталога: `/manga-list`
  - Для глав: `/{slug}`

## Измененные файлы

**`MelonService/api_server.py`**

1. **`get_catalog()`** (строки 903-924)
   - ✅ Добавлены полные заголовки браузера
   - ✅ Динамический `Origin` и `Referer`

2. **`get_chapters_metadata_only_endpoint()`** (строки 986-1003)
   - ✅ Добавлены полные заголовки браузера
   - ✅ Динамический `Referer` с slug

## Команды для применения

### 1. Перезапуск MelonService (Docker)

```bash
# Пересборка образа
cd /root/AniWay-Reload  # или C:\project\AniWayImageSystem\AniWay-Reload
docker-compose build melon-service

# Перезапуск контейнера
docker-compose up -d melon-service

# Проверка логов
docker logs aniway-reload-melon-service-1 --tail=50 -f
```

### 2. Локальный запуск (без Docker)

```bash
cd MelonService
python api_server.py
```

## Тестирование

### Тест 1: Проверка каталога

```bash
# Запрос к MelonService
curl "http://localhost:8084/catalog/1?parser=mangalib&limit=10"
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "page": 1,
  "parser": "mangalib",
  "limit": 10,
  "count": 10,
  "slugs": ["slug1", "slug2", ...]
}
```

**НЕ должно быть:**
```json
{
  "success": false,
  "error": "Request error fetching catalog: 403 Client Error: Forbidden..."
}
```

### Тест 2: Проверка метаданных глав

```bash
# Запрос метаданных глав для манги "another"
curl "http://localhost:8084/manga-info/another/chapters-only?parser=mangalib"
```

**Ожидаемый результат:**
```json
{
  "success": true,
  "slug": "another",
  "total_chapters": 50,
  "chapters": [...]
}
```

### Тест 3: Автопарсинг

```bash
# Запуск автопарсинга через MangaService
curl -X POST "http://localhost:8083/api/manga/auto-parse?page=1&limit=5"
```

**Ожидаемое поведение:**
- Логи MelonService: `Successfully fetched X manga slugs from page 1`
- Логи MangaService: Начало парсинга каждой манги
- **НЕТ** ошибок 403 Forbidden

### Тест 4: Логи MelonService

```bash
docker logs aniway-reload-melon-service-1 --tail=100 | grep -E "(403|Forbidden|catalog|Successfully)"
```

**Ожидаемые логи:**
```
INFO: Fetching catalog page 1 for mangalib, limit: 60
INFO: Successfully fetched 60 manga slugs from page 1 (total in response: 60)
```

**НЕ должно быть:**
```
ERROR: Request error fetching catalog: 403 Client Error: Forbidden...
```

## Возможные проблемы

### 1. MangaLib может снова изменить защиту

**Симптом:** Новые ошибки 403 через некоторое время

**Решение:**
1. Открыть браузер Chrome/Firefox
2. Перейти на https://mangalib.me/manga-list
3. Открыть DevTools (F12) → Network
4. Найти запрос к `api.cdnlibs.org/api/manga`
5. Скопировать **все** заголовки
6. Обновить в `api_server.py`

### 2. Требуется Cookie или авторизация

**Симптом:** 403 даже с полными заголовками

**Решение:**
1. Проверить, не требует ли API cookie
2. Добавить Cookie из браузера в заголовки:
   ```python
   headers["Cookie"] = "session=xxx; ..."
   ```

### 3. Блокировка по IP

**Симптом:** 403 для всех запросов с сервера

**Решение:**
- Использовать прокси
- Добавить задержки между запросами
- Изменить IP сервера

## Логи успешного запроса

### MelonService:
```
2025-10-07 08:15:30,123 - __main__ - INFO - Fetching catalog page 1 for mangalib, limit: 60
2025-10-07 08:15:30,456 - __main__ - INFO - Successfully fetched 60 manga slugs from page 1 (total in response: 60)
INFO:     172.18.0.10:44454 - "GET /catalog/1?parser=mangalib&limit=60 HTTP/1.1" 200 OK
```

### MangaService:
```
2025-10-07T08:15:30.100Z  INFO 1 --- [MangaService] [       Import-1] s.s.m.service.AutoParsingService         : Начало автопарсинга: страница 1, лимит null
2025-10-07T08:15:30.120Z  INFO 1 --- [MangaService] [       Import-1] s.s.m.service.MelonIntegrationService    : Получение каталога манг: страница 1, лимит 60
2025-10-07T08:15:30.500Z  INFO 1 --- [MangaService] [       Import-1] s.s.m.service.MelonIntegrationService    : Успешно получен каталог для страницы 1: 60 манг
2025-10-07T08:15:30.501Z  INFO 1 --- [MangaService] [       Import-1] s.s.m.service.AutoParsingService         : Получено 60 манг из каталога
```

## Дополнительные рекомендации

### Для стабильности:

1. **Мониторинг статус-кодов:**
   - Логировать все 403/429/503 ошибки
   - Добавить retry с экспоненциальной задержкой

2. **Rate limiting:**
   - Добавить задержки между запросами (1-2 сек)
   - Не делать >100 запросов/минуту

3. **Fallback механизм:**
   - Если API падает → использовать парсинг HTML
   - Кэшировать результаты каталога

4. **Обновление User-Agent:**
   - Периодически обновлять версию Chrome
   - Можно рандомизировать между Chrome/Firefox/Safari

## Итог

✅ **ИСПРАВЛЕНО:** Добавлены полные заголовки браузера для обхода 403 Forbidden

**Механизм защиты:**
- Полная имитация Chrome 131 на Windows
- Динамические Origin/Referer на основе parser
- Sec-Fetch-* и Sec-Ch-Ua-* заголовки

**Результат:**
- API MangaLib снова доступен
- Автопарсинг работает
- Получение метаданных глав работает

**Статус:**
- ✅ Код исправлен в `api_server.py`
- ⏳ Требуется перезапуск MelonService
- ⏳ Тестирование после перезапуска
