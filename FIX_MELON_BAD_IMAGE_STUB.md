# Исправление ошибки IsADirectoryError в MelonService

## Проблема

При парсинге манги MelonService падал с ошибкой:

```
IsADirectoryError: [Errno 21] Is a directory: '.'
at ImagesDownloader.py:141 in image
shutil.copy2(self.__ParserSettings.common.bad_image_stub, ImagePath)
```

### Контекст ошибки

Ошибка возникала при попытке скачать изображение, которое оказалось слишком маленьким (< 1000 байт). В этом случае парсер пытается заменить битое изображение заглушкой (`bad_image_stub`).

### Логика кода (ImagesDownloader.py:140-143)

```python
elif self.__ParserSettings.common.bad_image_stub:
    shutil.copy2(self.__ParserSettings.common.bad_image_stub, ImagePath)
    self.__SystemObjects.logger.warning(f"Image doesn't contain enough bytes: \"{url}\". Replaced by stub.")
```

## Причина

В `Parsers/mangalib/settings.json`:

```json
{
  "common": {
    "bad_image_stub": "",  // ❌ Пустая строка интерпретируется как '.' (текущая директория)
    ...
  }
}
```

**Проблема:**
- Пустая строка `""` в Python считается **falsy**, НО в данном контексте она передается в `shutil.copy2()`
- Python интерпретирует `""` как путь к текущей директории `'.'`
- `shutil.copy2()` пытается открыть директорию как файл → `IsADirectoryError`

**Почему условие сработало:**
```python
if self.__ParserSettings.common.bad_image_stub:  # "" == False, но...
```

На самом деле, проверка происходит **после** установки значения в объект, и пустая строка может быть передана дальше в код.

## Решение

### Изменено в `Parsers/mangalib/settings.json`:

```json
{
  "common": {
    "bad_image_stub": null,  // ✅ null вместо ""
    ...
  }
}
```

**Почему `null` работает:**
- В Python `null` (JSON) конвертируется в `None`
- `None` корректно обрабатывается условием `if self.__ParserSettings.common.bad_image_stub:`
- Блок с `shutil.copy2()` не выполняется
- Вместо этого выполняется `else: self.__SystemObjects.logger.error(...)`

### Поведение после исправления:

**До исправления:**
```
Изображение < 1000 байт → Попытка скопировать '.' → IsADirectoryError
```

**После исправления:**
```
Изображение < 1000 байт → Логируется ошибка → Парсинг продолжается
```

## Тестирование

1. **Пересобрать MelonService:**
   ```powershell
   cd c:\project\AniWayImageSystem\AniWay-Reload
   docker-compose build melon-service
   docker-compose restart melon-service
   ```

2. **Запустить автопарсинг с `limit=1`**

3. **Проверить логи:**
   ```
   ✅ Парсинг успешно завершается
   ⚠️ В логах могут появиться предупреждения: "Image doesn't contain enough bytes"
   ✅ Парсинг НЕ падает с IsADirectoryError
   ```

## Альтернативные решения

### Вариант 1: Создать файл-заглушку (не реализовано)

```json
{
  "bad_image_stub": "/app/assets/image_stub.png"
}
```

**Плюсы:** Битые изображения заменяются валидной заглушкой  
**Минусы:** Нужно создавать файл заглушки

### Вариант 2: Текущее решение (`null`)

```json
{
  "bad_image_stub": null
}
```

**Плюсы:** Простое, не требует дополнительных файлов  
**Минусы:** Битые изображения пропускаются (но логируются)

## Файлы изменены

- `MelonService/Parsers/mangalib/settings.json`
  - `"bad_image_stub": ""` → `"bad_image_stub": null`

## Связанные проблемы

Это исправление не связано с предыдущими исправлениями в MangaService. Ошибка возникала на стороне MelonService (Python parser) при обработке битых/маленьких изображений.

## Результат

После исправления парсинг должен успешно завершаться, даже если некоторые изображения битые или слишком маленькие. Битые изображения будут пропущены с логированием ошибки.
