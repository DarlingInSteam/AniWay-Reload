# 🚀 БЫСТРЫЙ ДЕПЛОЙ - Российский прокси для MelonService

## ✅ ЧТО СДЕЛАНО ЛОКАЛЬНО:

1. **Настроен прокси** в `settings.json`:
   - IP: 168.80.1.136:8000
   - Логин: PS20z2
   - Пароль: fFNHVg
   - Срок: до 14.10.25

2. **Обновлен код** `api_server.py`:
   - Функция `load_proxy_settings()` читает из settings.json
   - Переменная `PROXY_SETTINGS` используется во всех запросах

3. **Протестировано** ✅:
   ```
   ✅ IP через прокси: 168.80.1.136
   ✅ MangaLib API: 200 OK - получено 60 манг
   ```

---

## 📋 ЧТО НУЖНО СДЕЛАТЬ НА СЕРВЕРЕ:

### Вариант A: Через Git (5 минут)

```bash
# 1. На локальном ПК - коммит и пуш
cd c:\project\AniWayImageSystem\AniWay-Reload
git add MelonService/Parsers/mangalib/settings.json
git add MelonService/api_server.py
git commit -m "feat: Add Russian proxy for MangaLib (168.80.1.136:8000)"
git push origin develop

# 2. На сервере - пулл и рестарт
ssh user@your-server
cd /path/to/AniWay-Reload
git pull origin develop
docker-compose build melon-service
docker-compose up -d melon-service

# 3. Проверка логов
docker logs aniway-reload-melon-service-1 --tail=50
# Должно быть: ✅ Proxy configured and ready to use
```

### Вариант B: Ручное редактирование (3 минуты)

```bash
# 1. На сервере - открыть settings.json
ssh user@your-server
cd /path/to/AniWay-Reload/MelonService
nano Parsers/mangalib/settings.json

# 2. Изменить секцию "proxy":
"proxy": {
  "enable": true,
  "host": "168.80.1.136",
  "port": "8000",
  "login": "PS20z2",
  "password": "fFNHVg"
}

# 3. Сохранить: Ctrl+O, Enter, Ctrl+X

# 4. Пересобрать только если код api_server.py тоже изменился
# Если только settings.json - просто перезапустить
docker-compose restart melon-service

# 5. Проверка
docker logs aniway-reload-melon-service-1 --tail=50
```

---

## 🧪 ТЕСТИРОВАНИЕ:

### 1. Проверка прокси в логах:
```bash
docker logs aniway-reload-melon-service-1 | grep -i proxy
```
Должно быть:
```
✅ Proxy loaded from mangalib settings: 168.80.1.136:8000
✅ Proxy configured and ready to use
```

### 2. Тест внутри контейнера:
```bash
docker exec -it aniway-reload-melon-service-1 python /app/test_proxy.py
```
Должно быть:
```
✅ IP через прокси: 168.80.1.136
✅ MangaLib API: 200 OK - получено 60 манг
```

### 3. Тест автопарсинга через API:
```bash
curl -X POST "http://your-server:8080/api/manga/auto-parse?parser=mangalib&page=1&limit=3"
```
Должно вернуть JSON с успешно импортированными мангами.

---

## ⚠️ ВАЖНО:

- **Срок действия прокси:** до 14.10.25 (6 дней)
- После истечения срока нужно купить новый и обновить settings.json
- **НЕ коммитьте пароли** в публичный Git (см. RUSSIAN_PROXY_SETUP.md)

---

## 🐛 Если что-то не работает:

### Проблема: "Proxy disabled"
**Решение:** Проверьте `"enable": true` в settings.json

### Проблема: 403 Forbidden
**Решение:** 
- Проверьте срок действия прокси
- Проверьте логин/пароль
- Убедитесь, что прокси сам работает: 
  ```bash
  curl --proxy http://PS20z2:fFNHVg@168.80.1.136:8000 https://api.ipify.org
  ```

### Проблема: Timeout
**Решение:** Прокси может быть медленный, купите другой или увеличьте timeout в коде

---

## 📝 ФАЙЛЫ С ИЗМЕНЕНИЯМИ:

1. `MelonService/Parsers/mangalib/settings.json` - настройки прокси ✅
2. `MelonService/api_server.py` - загрузка прокси из settings.json ✅
3. `MelonService/test_proxy.py` - тестовый скрипт ✅
4. `MelonService/requirements.txt` - добавлен pysocks ✅

---

## 🎯 КОМАНДЫ ДЕПЛОЯ (КОПИПАСТА):

```bash
# ============================================
# НА ЛОКАЛЬНОМ ПК (Windows PowerShell):
# ============================================
cd c:\project\AniWayImageSystem\AniWay-Reload
git add MelonService/
git commit -m "feat: Russian proxy for MangaLib API (168.80.1.136:8000)"
git push origin develop

# ============================================
# НА СЕРВЕРЕ (Linux SSH):
# ============================================
cd /path/to/AniWay-Reload
git pull origin develop
docker-compose build melon-service
docker-compose up -d melon-service
docker logs aniway-reload-melon-service-1 --tail=50 | grep proxy

# Должно быть: ✅ Proxy configured and ready to use
```

---

## ✅ ГОТОВО!

После деплоя автопарсинг должен работать без 403 ошибок! 🎉
