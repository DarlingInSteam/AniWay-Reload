# MelonService API - Необходимые изменения

## Требуемые новые endpoints

### 1. POST /check-updates
Проверяет наличие новых глав для манги.

**Request:**
```json
{
  "slug": "manga-slug",
  "existing_chapters": [1.0, 2.0, 3.5, 4.0],
  "parser": "mangalib"
}
```

**Response:**
```json
{
  "has_updates": true,
  "new_chapters": [
    {
      "number": "5.0",
      "volume": "1",
      "name": "Глава 5"
    },
    {
      "number": "6.0", 
      "volume": "1",
      "name": "Глава 6"
    }
  ],
  "total_new_chapters": 2
}
```

**Логика:**
1. Получить slug и список существующих глав
2. Запустить парсинг манги (только метаданные, без скачивания изображений)
3. Сравнить номера глав в парсере с existing_chapters
4. Вернуть список новых глав

---

### 2. POST /parse-new-chapters
Парсит только указанные новые главы.

**Request:**
```json
{
  "slug": "manga-slug",
  "chapters": [
    {
      "number": "5.0",
      "volume": "1"
    },
    {
      "number": "6.0",
      "volume": "1"
    }
  ],
  "parser": "mangalib"
}
```

**Response:**
```json
{
  "task_id": "uuid-task-id",
  "status": "pending",
  "message": "Запущен парсинг 2 новых глав"
}
```

**Логика:**
1. Создать задачу парсинга
2. Парсить только указанные главы (номер + том)
3. Скачать изображения только для этих глав
4. Сохранить в формате, совместимом с существующим импортом
5. Вернуть task_id для отслеживания прогресса

---

## Реализация в Python (api_server.py)

### Endpoint: /check-updates

```python
@app.post("/check-updates")
async def check_updates(request: Request):
    """
    Проверяет наличие новых глав для манги
    """
    try:
        data = await request.json()
        slug = data.get("slug")
        existing_chapters = set(data.get("existing_chapters", []))
        parser_name = data.get("parser", "mangalib")
        
        # Запускаем быстрый парсинг (только метаданные)
        parser_class = get_parser_class(parser_name)
        parser = parser_class(slug)
        
        # Парсим структуру манги
        manga_data = parser.parse()
        
        # Собираем все главы из всех веток
        all_chapters = []
        if "content" in manga_data:
            for branch_id, chapters in manga_data["content"].items():
                for chapter in chapters:
                    chapter_num = calculate_chapter_number(
                        chapter.get("volume", 1),
                        chapter.get("number")
                    )
                    
                    if chapter_num not in existing_chapters:
                        all_chapters.append({
                            "number": str(chapter.get("number")),
                            "volume": str(chapter.get("volume", 1)),
                            "name": chapter.get("name", "")
                        })
        
        return {
            "has_updates": len(all_chapters) > 0,
            "new_chapters": all_chapters,
            "total_new_chapters": len(all_chapters)
        }
        
    except Exception as e:
        logger.error(f"Ошибка проверки обновлений: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


def calculate_chapter_number(volume, number):
    """
    Вычисляет уникальный номер главы (том * 1000 + номер)
    """
    try:
        vol = int(volume) if volume else 1
        num = float(number)
        return vol * 1000 + num
    except:
        return 0
```

### Endpoint: /parse-new-chapters

```python
@app.post("/parse-new-chapters")
async def parse_new_chapters(request: Request):
    """
    Парсит только указанные новые главы
    """
    try:
        data = await request.json()
        slug = data.get("slug")
        chapters_to_parse = data.get("chapters", [])
        parser_name = data.get("parser", "mangalib")
        
        task_id = str(uuid.uuid4())
        
        # Создаем задачу
        tasks_storage[task_id] = TaskStatus(
            task_id=task_id,
            status="PENDING",
            progress=0,
            message=f"Запущен парсинг {len(chapters_to_parse)} новых глав",
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat()
        )
        
        # Запускаем парсинг в фоне
        asyncio.create_task(
            parse_new_chapters_task(task_id, slug, chapters_to_parse, parser_name)
        )
        
        return {
            "task_id": task_id,
            "status": "pending",
            "message": f"Запущен парсинг {len(chapters_to_parse)} новых глав"
        }
        
    except Exception as e:
        logger.error(f"Ошибка запуска парсинга новых глав: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )


async def parse_new_chapters_task(task_id, slug, chapters_to_parse, parser_name):
    """
    Фоновая задача парсинга новых глав
    """
    try:
        update_task_status(task_id, "RUNNING", 10, "Инициализация парсера...")
        
        parser_class = get_parser_class(parser_name)
        parser = parser_class(slug)
        
        # Парсим полную структуру
        update_task_status(task_id, "RUNNING", 20, "Парсинг структуры манги...")
        manga_data = parser.parse()
        
        # Фильтруем только нужные главы
        update_task_status(task_id, "RUNNING", 40, "Фильтрация новых глав...")
        filtered_content = {}
        
        for branch_id, chapters in manga_data.get("content", {}).items():
            filtered_chapters = []
            
            for chapter in chapters:
                # Проверяем, входит ли глава в список для парсинга
                for target_chapter in chapters_to_parse:
                    if (str(chapter.get("number")) == target_chapter.get("number") and
                        str(chapter.get("volume", 1)) == target_chapter.get("volume", "1")):
                        filtered_chapters.append(chapter)
                        break
            
            if filtered_chapters:
                filtered_content[branch_id] = filtered_chapters
        
        manga_data["content"] = filtered_content
        
        # Сохраняем отфильтрованные данные
        update_task_status(task_id, "RUNNING", 60, "Сохранение данных...")
        output_dir = Path("output") / slug
        output_dir.mkdir(parents=True, exist_ok=True)
        
        with open(output_dir / f"{slug}.json", "w", encoding="utf-8") as f:
            json.dump(manga_data, f, ensure_ascii=False, indent=2)
        
        # Скачиваем изображения только для новых глав
        update_task_status(task_id, "RUNNING", 70, "Скачивание изображений...")
        
        for branch_id, chapters in filtered_content.items():
            for i, chapter in enumerate(chapters):
                progress = 70 + (25 * (i + 1) / len(chapters))
                update_task_status(
                    task_id, 
                    "RUNNING", 
                    int(progress),
                    f"Скачивание главы {chapter.get('number')}..."
                )
                
                # Скачиваем изображения главы
                await download_chapter_images(parser, slug, chapter)
        
        update_task_status(
            task_id,
            "COMPLETED",
            100,
            f"Успешно спарсено {len(chapters_to_parse)} новых глав",
            result_data={"filename": slug, "chapters_parsed": len(chapters_to_parse)}
        )
        
    except Exception as e:
        logger.error(f"Ошибка парсинга новых глав: {str(e)}")
        update_task_status(task_id, "FAILED", 100, f"Ошибка: {str(e)}")


async def download_chapter_images(parser, slug, chapter):
    """
    Скачивает изображения для одной главы
    """
    # Здесь реализация скачивания изображений
    # Аналогично существующей логике в билдере
    pass
```

---

## Дополнительные изменения в ChapterService

Необходимо добавить endpoint для проверки существования главы:

### GET /api/chapters/exists

**Query params:**
- `mangaId` (Long) - ID манги
- `chapterNumber` (Double) - Номер главы

**Response:**
```json
{
  "exists": true
}
```

---

## Итого

После добавления этих endpoints в MelonService:

1. ✅ **AutoParsingService** сможет автоматически парсить и импортировать новые манги
2. ✅ **MangaUpdateService** сможет проверять обновления и импортировать только новые главы
3. ✅ Будет работать проверка на дубликаты по `melonSlug` для манг
4. ✅ Будет работать проверка на дубликаты по `chapterNumber` для глав
5. ✅ Фронтенд сможет запускать автопарсинг и автообновление через кнопки

Все изменения интегрированы в существующую архитектуру и не ломают текущий функционал.
