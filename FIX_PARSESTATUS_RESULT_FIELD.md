# Исправление ошибки "ParseStatus" object has no field "result"

## Проблема

После успешного парсинга манги MelonService падал с ошибкой:
```
Критическая ошибка: "ParseStatus" object has no field "result"
```

## Причина

В `api_server.py` строка 211:
```python
tasks_storage[task_id].result = result  # ОШИБКА: поле называется results (множественное число)
```

Но в модели `ParseStatus`:
```python
class ParseStatus(BaseModel):
    ...
    results: List[Dict[str, Any]] = []  # Правильное название поля
```

## Решение

Исправлено в `update_task_status()`:

```python
if result:
    # Добавляем результат в список results (не result!)
    if isinstance(result, list):
        tasks_storage[task_id].results.extend(result)
    else:
        tasks_storage[task_id].results.append(result)
```

## Тестирование

1. Перезапустить MelonService:
   ```bash
   docker-compose restart melon-service
   ```

2. Проверить логи:
   ```bash
   docker-compose logs -f melon-service | grep -E "(result|FAILED)"
   ```

3. Запустить парсинг:
   - Через админ-панель или curl
   - Дождаться завершения
   - Проверить что статус `completed`, а не `FAILED`

## Ожидаемый результат

После завершения парсинга:
```python
# MelonService
status: "completed"
message: "Done in XX minutes YY seconds."
results: [{"filename": "i-alone-level-up", ...}]  # ✅ Результат добавлен

# MangaService должен получить:
status: "IMPORTING_MANGA"
message: "Запуск импорта..."
```

Без ошибки `"ParseStatus" object has no field "result"`.
