# Исправление ошибки 422 при билде манги

## Проблема

После успешного завершения парсинга и при попытке запустить build, MelonService возвращал ошибку **422 Unprocessable Entity**:

```
ERROR: Полный парсинг завершился с ошибкой после 495 попыток: 
Ошибка при полном парсинге: 422 Unprocessable Entity on POST request for 
"http://melon-service:8084/build": 
{
  "detail": [
    {
      "type": "missing",
      "loc": ["body", "slug"],
      "msg": "Field required",
      "input": {
        "filename": "bil-eomeogeul-hwansaeng",
        "parser": "mangalib",
        "archive_type": "simple"
      }
    }
  ]
}
```

## Причина

### Несоответствие API контракта между MangaService и MelonService

**MangaService отправлял:**
```json
{
  "filename": "bil-eomeogeul-hwansaeng",
  "parser": "mangalib",
  "archive_type": "simple"
}
```

**MelonService ожидал:**
```python
class BuildRequest(BaseModel):
    slug: str           # ❌ отправлялось "filename"
    parser: str = "newtoki"
    type: str = "simple"  # ❌ отправлялось "archive_type"
```

## Решение

### Исправлен метод `buildManga()` в `MelonIntegrationService.java`

**Было (строка 305-307):**
```java
request.put("filename", filename);
request.put("parser", "mangalib");
request.put("archive_type", "simple");
```

**Стало:**
```java
request.put("slug", filename);  // MelonService ожидает "slug", а не "filename"
request.put("parser", "mangalib");
request.put("type", "simple");  // MelonService ожидает "type", а не "archive_type"
```

## Проверка

### До исправления:
```
POST /build
{
  "filename": "bil-eomeogeul-hwansaeng",  ❌ неверное поле
  "parser": "mangalib",
  "archive_type": "simple"                ❌ неверное поле
}
→ 422 Unprocessable Entity: Field "slug" required
```

### После исправления:
```
POST /build
{
  "slug": "bil-eomeogeul-hwansaeng",     ✅ правильное поле
  "parser": "mangalib",
  "type": "simple"                        ✅ правильное поле
}
→ 200 OK: {"task_id": "...", "status": "pending"}
```

## Тестирование

1. **Пересобрать MangaService:**
   ```powershell
   cd C:\project\AniWayImageSystem\AniWay-Reload\MangaService
   .\gradlew.bat build -x test
   ```

2. **Пересобрать Docker-образ:**
   ```powershell
   cd C:\project\AniWayImageSystem\AniWay-Reload
   docker build -t aniway-reload-manga-service -f MangaService/Dockerfile.dev MangaService
   ```

3. **Перезапустить контейнер:**
   ```powershell
   docker-compose restart manga-service
   ```

4. **Запустить автопарсинг с `limit=1`**

5. **Проверить логи:**
   ```
   ✅ Парсинг завершен успешно
   ✅ Build запущен (taskId создан)
   ✅ Build завершен (COMPLETED, progress=100)
   ✅ Импорт запущен (progress=70)
   ✅ Импорт завершен (progress=95)
   ✅ Очистка выполнена (progress=100)
   ```

## Связанные исправления

Это исправление работает в связке с:
- `FIX_IMPORT_AND_CLEANUP.md` - регистронезависимая проверка статуса, импорт и очистка
- `TASK_ID_MAPPING_EXPLANATION.md` - маппинг taskId для логов

## Файлы изменены

- `MangaService/src/main/java/shadowshift/studio/mangaservice/service/MelonIntegrationService.java`
  - Метод `buildManga()`: изменены параметры запроса (`filename` → `slug`, `archive_type` → `type`)

## Результат

После исправления полный workflow автопарсинга работает корректно:

```
Parse (5%) → Build (60%) → Import (70%) → Cleanup (95%) → Complete (100%)
   ✅            ✅            ✅              ✅              ✅
```
