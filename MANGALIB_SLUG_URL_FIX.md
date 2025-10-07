# 🎯 Исправление MangaLib парсинга (404 ошибки)

## 📌 Проблема

MangaLib изменил структуру URL и API:

**❌ Старый формат (не работает):**
```
API возвращает: slug = "sweet-home-kim-carnby-"
URL тайтла: https://mangalib.me/sweet-home-kim-carnby-
Результат: 404 Not Found
```

**✅ Новый формат (работает):**
```
API возвращает: slug_url = "3754--sweet-home-kim-carnby-"  
URL тайтла: https://mangalib.me/ru/manga/3754--sweet-home-kim-carnby-
Результат: 200 OK
```

---

## 🔧 Решение

### Изменения в коде:

#### 1. **MelonService/api_server.py** (строки ~1003-1009)

**БЫЛО:**
```python
slug = manga.get("slug", manga.get("slug_url", manga.get("eng_name", "")))
```

**СТАЛО:**
```python
# MangaLib изменил структуру URL: теперь используется slug_url (формат: ID--slug)
# Приоритет: slug_url > slug > eng_name
slug = manga.get("slug_url", manga.get("slug", manga.get("eng_name", "")))
```

#### 2. **MelonService/Parsers/mangalib/main.py** (строки ~551-569)

**БЫЛО:**
```python
if self._Title.id and self._Title.slug: 
    self.__TitleSlug = f"{self._Title.id}--{self._Title.slug}"
else: 
    self.__TitleSlug = self._Title.slug
```

**СТАЛО:**
```python
# MangaLib изменил структуру: теперь slug'и из API имеют формат "ID--slug"
# Проверяем, содержит ли slug ID (формат: "7580--i-alone-level-up")
if "--" in self._Title.slug and not self._Title.id:
    # Извлекаем ID и slug из формата "ID--slug"
    parts = self._Title.slug.split("--", 1)
    if len(parts) == 2 and parts[0].isdigit():
        self._Title.set_id(int(parts[0]))
        self._Title.set_slug(parts[1])
        print(f"[DEBUG] 📌 Extracted from slug_url: ID={self._Title.id}, slug={self._Title.slug}")

if self._Title.id and self._Title.slug: 
    self.__TitleSlug = f"{self._Title.id}--{self._Title.slug}"
else: 
    self.__TitleSlug = self._Title.slug
```

---

## 🧪 Тестирование (локально на Windows)

```bash
cd C:\project\AniWayImageSystem\AniWay-Reload\MelonService
python test_final_mangalib.py
```

**Результат:**
```
✅ API endpoint: 3/3 успешно
✅ WEB страницы: 3/3 доступны
🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!
```

**Проверенные slug_url:**
- `7580--i-alone-level-up` → ✅ 200 OK
- `34466--jeonjijeog-dogja-sijeom_` → ✅ 200 OK
- `3754--sweet-home-kim-carnby-` → ✅ 200 OK

---

## 🚀 Деплой на сервер

### 1. Коммит и пуш изменений

```bash
# На локальной машине (Windows)
cd C:\project\AniWayImageSystem\AniWay-Reload

git add MelonService/api_server.py
git add MelonService/Parsers/mangalib/main.py
git commit -m "fix: MangaLib slug_url format (ID--slug) для исправления 404 ошибок"
git push origin develop
```

### 2. Обновление на сервере

```bash
# SSH на сервер
ssh darling@compute-vm-12-24-30-ssd-1758530558688

cd ~/AniWay-Reload

# Если есть uncommitted changes в docker-compose.prod.yml
git stash push -m "Production proxy credentials"
git pull origin develop
git stash pop

# Если конфликты - решить вручную:
# nano docker-compose.prod.yml
# git add docker-compose.prod.yml
# git stash drop
```

### 3. Пересборка и перезапуск

```bash
# Пересобрать MelonService
docker-compose -f docker-compose.prod.yml build melon-service

# Перезапустить контейнер
docker-compose -f docker-compose.prod.yml up -d melon-service

# Проверить логи
docker logs -f aniway-reload-melon-service-1
```

**Ожидаемые логи:**
```
[INFO] ✅ Proxy configured via Session (private): http://PS20z2:***@168.80.1.136:8000
[DEBUG] 📌 Extracted from slug_url: ID=7580, slug=i-alone-level-up
[DEBUG] 📛 Using TitleSlug: 7580--i-alone-level-up
```

### 4. Тестирование на сервере

```bash
# Тест каталога
curl -X GET "http://localhost:8084/catalog/1?parser=mangalib&limit=5"

# Должен вернуть slug_url в формате "ID--slug":
# {
#   "slugs": [
#     "7580--i-alone-level-up",
#     "34466--jeonjijeog-dogja-sijeom_",
#     ...
#   ]
# }
```

```bash
# Тест парсинга
curl -X POST "http://YOUR_SERVER:8080/api/manga/auto-parse?parser=mangalib&page=1&limit=3"
```

**Ожидаемый результат:**
- ✅ Каталог возвращает slug_url (формат `ID--slug`)
- ✅ Парсер извлекает ID из slug_url
- ✅ API запросы используют правильный формат
- ✅ Нет ошибок 404 "Title not found"
- ✅ Манга успешно импортируется

---

## 🔍 Проверка после деплоя

### 1. Проверка каталога

```bash
docker logs aniway-reload-melon-service-1 | grep "Successfully fetched"
```

**Ожидается:**
```
Successfully fetched 60 manga slugs from page 1
```

### 2. Проверка парсинга

```bash
docker logs aniway-reload-melon-service-1 | grep -A 5 "Starting parse"
```

**Ожидается:**
```
[DEBUG] 🚀 Starting parse() for title: 7580--i-alone-level-up
[DEBUG] 📌 Extracted from slug_url: ID=7580, slug=i-alone-level-up
[DEBUG] 📛 Using TitleSlug: 7580--i-alone-level-up
[DEBUG] 🔍 Requesting title data for: 7580--i-alone-level-up
[DEBUG] 📡 Response status: 200
[DEBUG] 📦 GetTitleData returned: <class 'dict'>, is None: False
[DEBUG] ✅ Data keys: ['id', 'name', 'rus_name', 'eng_name', ...]
```

### 3. Проверка импорта

Зайдите в админ-панель MangaService и запустите автопарсинг:
- Страница: 1
- Лимит: 5
- Парсер: mangalib

**Результат:**
- ✅ Все 5 манги успешно импортированы
- ✅ Нет ошибок "Title not found"
- ✅ JSON файлы созданы
- ✅ Главы загружены

---

## 🐛 Возможные проблемы

### Проблема 1: Git merge conflict

**Ошибка:**
```
error: Your local changes to the following files would be overwritten by merge:
    docker-compose.prod.yml
```

**Решение:**
```bash
git stash push -m "Production proxy credentials"
git pull origin develop
git stash pop
# Если конфликт - решить вручную
nano docker-compose.prod.yml
# Убрать маркеры <<<<<<<, =======, >>>>>>>
git add docker-compose.prod.yml
git stash drop
```

### Проблема 2: Парсер все еще возвращает 404

**Причина:** Старые slug'и в кеше

**Решение:**
```bash
# Очистить кеш парсера
docker exec -it aniway-reload-melon-service-1 rm -rf /app/Parsers/mangalib/.cache

# Перезапустить контейнер
docker-compose -f docker-compose.prod.yml restart melon-service
```

### Проблема 3: Прокси не работает

**Проверка:**
```bash
docker exec aniway-reload-melon-service-1 env | grep PROXY
```

**Должно вернуть:**
```
HTTP_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
HTTPS_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
NO_PROXY=localhost,127.0.0.1,postgres,redis,rabbitmq
```

Если пусто:
```bash
# Проверить docker-compose.prod.yml
nano docker-compose.prod.yml

# Убедиться, что есть:
melon-service:
  environment:
    - HTTP_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
    - HTTPS_PROXY=http://PS20z2:fFNHVg@168.80.1.136:8000
    - NO_PROXY=localhost,127.0.0.1,postgres,redis,rabbitmq

# Пересобрать
docker-compose -f docker-compose.prod.yml up -d melon-service
```

---

## 📊 Статистика изменений

**Измененные файлы:**
- `MelonService/api_server.py` - 1 строка
- `MelonService/Parsers/mangalib/main.py` - 11 строк

**Причина ошибок:**
- MangaLib изменил структуру URL с `.me/{slug}` на `.me/ru/manga/{ID}--{slug}`
- API каталога стал возвращать `slug_url` вместо `slug`

**Решение:**
- Использовать `slug_url` из API каталога
- Извлекать ID из формата `ID--slug` в парсере
- Формировать правильный `TitleSlug` для API запросов

---

## ✅ Чеклист деплоя

- [ ] Закоммитить изменения в git
- [ ] Запушить на GitHub (develop branch)
- [ ] Залогиниться на сервер по SSH
- [ ] Сохранить локальные изменения (`git stash`)
- [ ] Обновить код (`git pull origin develop`)
- [ ] Вернуть локальные изменения (`git stash pop`)
- [ ] Решить конфликты (если есть)
- [ ] Пересобрать образ (`docker-compose build melon-service`)
- [ ] Перезапустить контейнер (`docker-compose up -d melon-service`)
- [ ] Проверить переменные окружения (`docker exec ... env | grep PROXY`)
- [ ] Проверить логи (`docker logs -f ...`)
- [ ] Протестировать каталог (curl `/catalog/1`)
- [ ] Протестировать автопарсинг (curl `/parse`)
- [ ] Импортировать 5-10 манги через админ-панель
- [ ] Убедиться, что нет ошибок 404
- [ ] Проверить, что главы загружаются

---

## 🎯 Ожидаемый результат

После деплоя:
- ✅ Каталог возвращает slug'и в формате `ID--slug`
- ✅ Парсер корректно обрабатывает новый формат
- ✅ API запросы используют slug_url
- ✅ Манга успешно импортируется без ошибок 404
- ✅ Прокси работает (логи показывают "Proxy configured")

**Время работы:** ~40 минут на импорт манги с 200+ главами (как и раньше).

---

## 📝 Примечания

1. **Обратная совместимость:** Код поддерживает как старый формат (`slug`), так и новый (`slug_url`)
2. **Прокси:** Срок действия до 14.10.2025 (осталось 6 дней)
3. **Мониторинг:** Следить за логами первые 24 часа после деплоя

**Дата исправления:** 07.10.2025  
**Версия:** 2.0 (slug_url support)  
**Автор:** GitHub Copilot
