# Резюме: Фикс 403 Forbidden от MangaLib API

## Проблема
```
403 Client Error: Forbidden for url: https://api.cdnlibs.org/api/manga?...
```

Автопарсинг не работает - MangaLib API блокирует запросы.

## Причина
MangaLib **усилил защиту API** и теперь требует **полный набор заголовков браузера**, а не только `Site-Id` и простой `User-Agent`.

## Решение

### Старые заголовки (блокировались):
```python
headers = {
    "Site-Id": site_id,
    "User-Agent": "Mozilla/5.0"  # ← Слишком простой!
}
```

### Новые заголовки (обходят защиту):
```python
headers = {
    "Site-Id": site_id,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Origin": f"https://{parser}.me",  # ← Динамический!
    "Referer": f"https://{parser}.me/manga-list",  # ← Динамический!
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"'
}
```

## Измененные файлы

**`MelonService/api_server.py`**

1. **`get_catalog()`** - endpoint `/catalog/{page}`
   - ✅ Добавлены полные заголовки Chrome 131
   - ✅ Динамические `Origin` и `Referer`

2. **`get_chapters_metadata_only_endpoint()`** - endpoint `/manga-info/{slug}/chapters-only`
   - ✅ Добавлены полные заголовки Chrome 131
   - ✅ Динамический `Referer` с slug

## Команды для применения

### На сервере (Linux):
```bash
cd /root/AniWay-Reload
docker-compose build melon-service
docker-compose up -d melon-service

# Проверка логов
docker logs aniway-reload-melon-service-1 --tail=50 -f
```

### Локально (Windows):
```bash
cd C:\project\AniWayImageSystem\AniWay-Reload
docker-compose build melon-service
docker-compose up -d melon-service

# Проверка логов
docker logs aniway-reload-melon-service-1 --tail=50 -f
```

## Тестирование

### Тест 1: Каталог
```bash
curl "http://localhost:8084/catalog/1?parser=mangalib&limit=10"
```

**Ожидаемо:** `{"success": true, "count": 10, "slugs": [...]}`

### Тест 2: Автопарсинг
```bash
curl -X POST "http://localhost:8083/api/manga/auto-parse?page=1&limit=5"
```

**Ожидаемо:** Запуск парсинга без ошибок 403

### Тест 3: Логи
```bash
docker logs aniway-reload-melon-service-1 --tail=100 | grep -E "(403|Forbidden|Successfully)"
```

**Ожидаемо:** `Successfully fetched X manga slugs from page 1`  
**НЕ должно быть:** `403 Client Error: Forbidden`

## Почему это сработает?

1. **Полная имитация браузера** - API думает, что это реальный пользователь
2. **Правильный Origin/Referer** - запрос якобы идет с mangalib.me
3. **Sec-Fetch-* заголовки** - браузерные метаданные
4. **Sec-Ch-Ua-* заголовки** - информация о Chrome/Windows

## Статус

- ✅ **Код исправлен** в `api_server.py`
- ⏳ **Требуется перезапуск** MelonService (docker-compose)
- ⏳ **Тестирование** после перезапуска

## Что делать, если снова 403?

MangaLib может снова изменить защиту. В этом случае:

1. Открыть https://mangalib.me/manga-list в Chrome
2. DevTools (F12) → Network → найти запрос к `api.cdnlibs.org`
3. Скопировать **все** заголовки из браузера
4. Обновить в `api_server.py`

## Дополнительная документация

- **Полное описание:** `FIX_403_MANGALIB_API.md`
- **Автопарсинг фикс:** `FIX_AUTOPARSING_JSON_NOT_FOUND.md`
- **Все фиксы:** `ALL_FIXES_SUMMARY.md`
