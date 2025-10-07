# 🚀 БЫСТРЫЙ ДЕПЛОЙ - Фикс прокси в парсере

## Ошибка (до фикса):
```
AttributeError: 'ParserSettings' object has no attribute 'proxy'
File "/app/Parsers/mangalib/main.py", line 64, in _InitializeRequestor
    if self._Settings.proxy.enable:
```

## Решение:
Использовать `self._Settings._Raw.get("proxy", {})` вместо `self._Settings.proxy`

## Деплой:

```bash
# ============================================
# НА ЛОКАЛЬНОМ ПК (Windows):
# ============================================
cd c:\project\AniWayImageSystem\AniWay-Reload

# Коммит
git add MelonService/Parsers/mangalib/main.py
git add MelonService/Parsers/mangalib/settings.json
git commit -m "fix: Parser proxy AttributeError - use _Raw dict

- Fixed: AttributeError 'ParserSettings' object has no attribute 'proxy'
- Changed: self._Settings.proxy → self._Settings._Raw.get('proxy')
- Fixed: port type in settings.json (string → int)
- Added: Proxy logging and error handling"
git push origin develop

# ============================================
# НА СЕРВЕРЕ:
# ============================================
ssh user@server
cd ~/AniWay-Reload
git pull origin develop
docker-compose build melon-service
docker-compose up -d melon-service

# Проверка логов
docker logs aniway-reload-melon-service-1 --tail=50 | grep -E "Proxy|ERROR"
```

## Ожидаемый результат в логах:

```
✅ Proxy loaded from mangalib settings: 168.80.1.136:8000
✅ Proxy configured and ready to use
[INFO] Parser: mangalib.
[INFO] ✅ Proxy configured: 168.80.1.136:8000  ← НОВОЕ!
[INFO] Parsing sweet-home-kim-carnby-...
[INFO] Title data received successfully         ← Вместо 403!
```

## Тест после деплоя:

```bash
# Тест автопарсинга (должно работать без 403)
curl -X POST "http://server:8080/api/manga/auto-parse?parser=mangalib&page=1&limit=3"

# Проверка логов
docker logs -f aniway-reload-melon-service-1
```

## Если все еще ошибка:

### AttributeError: '_Raw' not found

Значит версия Melon старая. Альтернативное решение:

```bash
# Используйте переменные окружения
docker-compose.yml:
  melon-service:
    environment:
      - HTTP_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
      - HTTPS_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
```

### Все еще 403 в парсере:

1. Проверьте, что прокси работает вручную:
```bash
docker exec -it aniway-reload-melon-service-1 bash
curl --proxy http://PS20z2:fFNHVg@168.80.1.136:8000 \
  -H "Site-Id: 1" \
  "https://api.cdnlibs.org/api/manga?page=1"
```

2. Если прокси не работает → купите другой прокси
3. Если прокси работает → проблема в коде (пишите в issues)

---

## Изменения:

1. ✅ `main.py` - использует `_Raw` словарь для доступа к proxy
2. ✅ `settings.json` - port исправлен на int (8000)
3. ✅ Добавлено логирование прокси в парсере
4. ✅ Добавлена обработка ошибок (try-except)

## Следующий шаг:

Деплой → Тест → Проверка логов → Profit! 🎉
