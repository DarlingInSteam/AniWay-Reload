# MANGALIB SLUG FIX - ФИНАЛЬНАЯ ВЕРСИЯ

## 📋 Описание проблемы

MangaLib изменил API структуру:
1. **Каталог API** возвращает `slug_url` вместо `slug`: `"7820--suddenly-became-a-princess-one-day-"` (формат `ID--slug`)
2. **Title API** требует **полный slug_url** для запросов: `/api/manga/21955--white-blood_`
3. **JSON файл** Melon сохраняет как `slug.json` **БЕЗ ID**: `white-blood_.json`
4. **MangaService** ищет файл по **чистому slug** (без ID)

### Проблема 1: 404 Title not found
- API требует `ID--slug`, а парсер отправлял только `slug`

### Проблема 2: JSON файл не найден  
- Melon сохраняет `white-blood_.json`
- MangaService искал `21955--white-blood_.json`

---

## ✅ Решение

### 1. `api_server.py` - Приоритет `slug_url`

**Файл**: `MelonService/api_server.py` (строка ~1007)

```python
# БЫЛО:
slug = manga.get("slug", manga.get("slug_url", manga.get("eng_name", "")))

# СТАЛО:
slug = manga.get("slug_url", manga.get("slug", manga.get("eng_name", "")))
```

**Эффект**: Каталог возвращает полный `slug_url` (`ID--slug`)

---

### 2. `main.py` - Разделение slug для API и файла

**Файл**: `MelonService/Parsers/mangalib/main.py` (строки 621-653)

#### БЫЛО (неправильно):
```python
# Использовали чистый slug для API - получали 404
clean_slug_for_api = parts[1]
self.__TitleSlug = clean_slug_for_api  # ❌ API получал "white-blood_"
```

#### СТАЛО (правильно):
```python
# Сохраняем slug для обработки
slug_with_id = self._Title.slug
clean_slug = self._Title.slug
extracted_id = None

if "--" in self._Title.slug:
    parts = self._Title.slug.split("--", 1)
    if len(parts) == 2 and parts[0].isdigit():
        extracted_id = int(parts[0])
        clean_slug = parts[1]
        print(f"[DEBUG] Extracted: ID={extracted_id}, slug={clean_slug}")

# API требует полный slug (ID--slug)
self.__TitleSlug = slug_with_id  # ✅ "21955--white-blood_"

# Файл сохраняется без ID
self._Title.set_slug(clean_slug)  # ✅ "white-blood_"

print(f"[DEBUG] TitleSlug (API): {self.__TitleSlug}")
print(f"[DEBUG] Title.slug (file): {self._Title.slug}")
```

**Ключевые изменения**:
1. `self.__TitleSlug` = **полный slug с ID** → для API запросов
2. `self._Title.slug` = **чистый slug без ID** → для имени JSON файла
3. ID извлекается из `slug_url` и устанавливается в `Title.id`

---

### 3. Установка ID

```python
if Data:
    self._Title.set_site(self.__CheckCorrectDomain(Data))
    
    # ID устанавливаем из извлечённого или из API
    if extracted_id is not None:
        self._Title.set_id(extracted_id)
        if extracted_id != Data["id"]:
            print(f"[WARNING] ID mismatch: extracted={extracted_id}, API={Data['id']} (using extracted)")
    else:
        self._Title.set_id(Data["id"])
    
    # Slug УЖЕ установлен выше (чистый, без ID)
    print(f"[DEBUG] Final slug (file): {self._Title.slug}")
    print(f"[DEBUG] Final ID: {self._Title.id}")
```

**НЕ перезаписываем** `Title.slug` значением из API (`Data["slug"]`), т.к. мы уже установили чистый slug.

---

## 📊 Результат

| Компонент | До исправления | После исправления |
|-----------|---------------|-------------------|
| **API каталог** | `slug` → `"white-blood_"` | `slug_url` → `"21955--white-blood_"` |
| **API запрос Title** | `/api/manga/white-blood_` ❌ | `/api/manga/21955--white-blood_` ✅ |
| **JSON файл** | `21955--white-blood_.json` ❌ | `white-blood_.json` ✅ |
| **MangaService ищет** | `21955--white-blood_.json` | `white-blood_.json` |
| **Результат** | ❌ Не находит файл | ✅ Находит файл |

---

## 🧪 Тестирование

### Локальные тесты
```bash
cd MelonService
python test_slug_logic_v2.py
```

**Результаты**:
- ✅ API slug: `21955--white-blood_`
- ✅ File slug: `white-blood_.json`
- ✅ ID extraction: `21955`

### Production тесты
```bash
ssh darling@89.169.176.162
docker logs aniway-reload-melon-service-1 --tail=50 | grep DEBUG
```

**Ожидаемый вывод**:
```
[DEBUG] Extracted: ID=21955, slug=white-blood_
[DEBUG] TitleSlug (API): 21955--white-blood_
[DEBUG] Title.slug (file): white-blood_
[DEBUG] Final slug (file): white-blood_
[DEBUG] Final ID: 21955
```

---

## 🚀 Деплой

### 1. Коммит изменений
```bash
cd C:\project\AniWayImageSystem\AniWay-Reload
git add MelonService/api_server.py
git add MelonService/Parsers/mangalib/main.py
git commit -m "fix: MangaLib slug_url support - API uses ID--slug, file saves as slug.json"
git push origin develop
```

### 2. Деплой на сервер
```bash
ssh darling@89.169.176.162
cd ~/AniWay-Reload
git pull origin develop
docker-compose -f docker-compose.prod.yml build melon-service
docker-compose -f docker-compose.prod.yml up -d melon-service
```

### 3. Проверка
```bash
docker logs aniway-reload-melon-service-1 --tail=100 | grep -E "Extracted|TitleSlug|Final"
```

---

## 📁 Изменённые файлы

1. **MelonService/api_server.py**
   - Приоритет `slug_url` над `slug`
   - Proxy rotation support

2. **MelonService/Parsers/mangalib/main.py**
   - Разделение `__TitleSlug` (API) и `_Title.slug` (file)
   - Извлечение ID из `slug_url`
   - Установка чистого slug для имени файла
   - Proxy rotation support

3. **MelonService/Parsers/mangalib/settings.json**
   - `retries`: 1 → 3
   - `delay`: 1 → 2
   - Proxy format: array support

4. **MelonService/proxy_rotator.py** (новый файл)
   - Ротация прокси (round-robin)
   - Поддержка 1+ прокси
   - Thread-safe

5. **docker-compose.prod.yml**
   - Комментарии по proxy rotation
   - HTTP_PROXY/HTTPS_PROXY environment variables

---

## 🔍 Диагностика проблем

### Проблема: "Title not found" (404)
**Причина**: API slug без ID  
**Решение**: Проверить `self.__TitleSlug` - должен быть `ID--slug`

### Проблема: "JSON файл не найден"
**Причина**: Имя файла с ID  
**Решение**: Проверить `self._Title.slug` - должен быть чистый `slug`

### Проблема: ID mismatch warning
**Причина**: ID из slug_url ≠ ID из API  
**Решение**: Используем ID из slug_url (более надёжный)

---

## 📝 Примеры

### Пример 1: white-blood_
```
Input:  "21955--white-blood_"
API:    https://api.cdnlibs.org/api/manga/21955--white-blood_
File:   /app/Output/mangalib/titles/white-blood_.json
Result: ✅ SUCCESS
```

### Пример 2: suddenly-became-a-princess-one-day-
```
Input:  "7820--suddenly-became-a-princess-one-day-"
API:    https://api.cdnlibs.org/api/manga/7820--suddenly-became-a-princess-one-day-
File:   /app/Output/mangalib/titles/suddenly-became-a-princess-one-day-.json
Result: ✅ SUCCESS
```

### Пример 3: Legacy slug (без ID)
```
Input:  "solo-leveling"
API:    https://api.cdnlibs.org/api/manga/solo-leveling
File:   /app/Output/mangalib/titles/solo-leveling.json
Result: ✅ SUCCESS (backward compatible)
```

---

## ⚠️ Важные заметки

1. **НЕ удаляйте** ID из slug до API запроса
2. **НЕ перезаписывайте** `Title.slug` значением из `Data["slug"]`
3. **ВСЕГДА** устанавливайте чистый slug через `set_slug()` перед сохранением
4. **Proxy rotation** работает автоматически при нескольких прокси в settings.json

---

**Дата**: 2025-10-07  
**Версия**: v2.0 (финальная)  
**Статус**: ✅ Протестировано, готово к деплою
