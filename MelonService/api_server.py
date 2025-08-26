from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import subprocess
import json
import os
import sys
import asyncio
from pathlib import Path
import shutil
import uuid
from datetime import datetime
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="MelonService API", version="1.0.0")

# Базовые модели
class ParseRequest(BaseModel):
    slug: str
    parser: str = "mangalib"

class BuildRequest(BaseModel):
    filename: str
    parser: str = "mangalib"
    branch_id: Optional[str] = None
    archive_type: str = "simple"  # simple, zip, cbz

class ParseStatus(BaseModel):
    task_id: str
    status: str  # pending, running, completed, failed
    progress: int
    message: str
    created_at: str
    updated_at: str
    result: Optional[Dict[str, Any]] = None

# Глобальное хранилище задач (в production лучше использовать Redis)
tasks_storage: Dict[str, ParseStatus] = {}

# Вспомогательные функции
def get_melon_base_path() -> Path:
    return Path("/app")

def ensure_utf8_patch():
    """Применяет критический патч для UTF-8 кодировки"""
    dublib_path = get_melon_base_path() / "dublib" / "Methods" / "Filesystem.py"

    if dublib_path.exists():
        content = dublib_path.read_text(encoding='utf-8')
        # Проверяем, нужен ли патч
        if 'open(path, "w")' in content and 'encoding="utf-8"' not in content:
            logger.info("Applying UTF-8 patch to dublib...")
            content = content.replace(
                'open(path, "w")',
                'open(path, "w", encoding="utf-8")'
            )
            dublib_path.write_text(content, encoding='utf-8')
            logger.info("UTF-8 patch applied successfully")

def ensure_cross_device_patch():
    """Исправляет ошибку 'Invalid cross-device link' в MangaBuilder"""
    try:
        # Ищем файл MangaBuilder.py в локальной структуре проекта
        base_path = Path(__file__).parent  # Директория где находится api_server.py
        possible_paths = [
            base_path / "Source" / "Core" / "Base" / "Builders" / "MangaBuilder.py",
            get_melon_base_path() / "Source" / "Core" / "Base" / "Builders" / "MangaBuilder.py",
            get_melon_base_path() / "dublib" / "Source" / "Core" / "Base" / "Builders" / "MangaBuilder.py",
        ]

        builder_path = None
        for path in possible_paths:
            if path.exists():
                builder_path = path
                break

        if not builder_path:
            logger.warning("MangaBuilder.py not found in expected locations, searching recursively...")
            # Поиск в текущей директории проекта
            for builder_file in base_path.rglob("**/MangaBuilder.py"):
                builder_path = builder_file
                break

        if builder_path and builder_path.exists():
            content = builder_path.read_text(encoding='utf-8')

            # Проверяем, нужен ли патч для os.replace
            if 'os.replace(' in content and 'shutil.move(' not in content:
                logger.info(f"Applying cross-device link patch to {builder_path}")

                # Заменяем os.replace на shutil.move
                content = content.replace('os.replace(', 'shutil.move(')

                # Убеждаемся, что shutil импортирован (он уже есть в файле)
                if 'import shutil' not in content and 'shutil' in content:
                    # Добавляем импорт если его нет
                    lines = content.split('\n')
                    import_line_idx = 0
                    for i, line in enumerate(lines):
                        if line.strip().startswith('import ') or line.strip().startswith('from '):
                            import_line_idx = i + 1
                    if 'import shutil' not in content:
                        lines.insert(import_line_idx, 'import shutil')
                        content = '\n'.join(lines)

                # Записываем исправленный файл
                builder_path.write_text(content, encoding='utf-8')
                logger.info("Cross-device link patch applied successfully")
            else:
                logger.info("Cross-device link patch already applied or not needed")
        else:
            logger.warning("Could not find MangaBuilder.py file for patching")

    except Exception as e:
        logger.warning(f"Could not apply cross-device patch: {e}")
        # Попробуем применить патч в runtime при импорте
        logger.info("Attempting runtime patching...")
        try:
            import sys
            import types

            # Создаем патч для os.replace
            original_replace = os.replace
            def patched_replace(src, dst):
                try:
                    return original_replace(src, dst)
                except OSError as e:
                    if "Invalid cross-device link" in str(e):
                        logger.warning(f"Cross-device link detected, using shutil.move instead: {src} -> {dst}")
                        return shutil.move(src, dst)
                    raise

            # Заменяем os.replace на патченую версию
            os.replace = patched_replace
            logger.info("Runtime cross-device link patch applied")
        except Exception as runtime_error:
            logger.error(f"Runtime patching failed: {runtime_error}")

def update_task_status(task_id: str, status: str, progress: int, message: str, result: Optional[Dict] = None):
    """Обновляет статус задачи"""
    if task_id in tasks_storage:
        tasks_storage[task_id].status = status
        tasks_storage[task_id].progress = progress
        tasks_storage[task_id].message = message
        tasks_storage[task_id].updated_at = datetime.now().isoformat()
        if result:
            tasks_storage[task_id].result = result

async def run_melon_command(command: List[str], task_id: str) -> Dict[str, Any]:
    """Запускает команду MelonService асинхронно"""
    try:
        # Активируем виртуальное окружение и запускаем команду
        base_path = get_melon_base_path()

        # Для Windows в Docker используем python напрямую
        full_command = ["python", "main.py"] + command[2:]  # убираем "python main.py"

        logger.info(f"Running command: {' '.join(full_command)}")
        update_task_status(task_id, "running", 10, "Executing Melon command...")

        # Запускаем процесс
        process = await asyncio.create_subprocess_exec(
            *full_command,
            cwd=base_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        stdout, stderr = await process.communicate()

        if process.returncode == 0:
            logger.info("Command completed successfully")
            return {
                "success": True,
                "stdout": stdout.decode('utf-8', errors='ignore'),
                "stderr": stderr.decode('utf-8', errors='ignore'
                )
            }
        else:
            logger.error(f"Command failed with return code {process.returncode}")
            return {
                "success": False,
                "stdout": stdout.decode('utf-8', errors='ignore'),
                "stderr": stderr.decode('utf-8', errors='ignore'),
                "return_code": process.returncode
            }

    except Exception as e:
        logger.error(f"Error running command: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

# API Endpoints
@app.get("/")
async def root():
    return {"message": "MelonService API is running", "version": "1.0.0"}

@app.post("/parse")
async def parse_manga(request: ParseRequest, background_tasks: BackgroundTasks):
    """Запускает парсинг манги"""
    task_id = str(uuid.uuid4())

    # Создаем задачу
    tasks_storage[task_id] = ParseStatus(
        task_id=task_id,
        status="pending",
        progress=0,
        message="Парсинг поставлен в очередь",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )

    # Добавляем в фоновые задачи
    background_tasks.add_task(
        execute_parse_task,
        task_id,
        request.slug,
        request.parser
    )

    return {"task_id": task_id, "status": "pending"}

@app.post("/build")
async def build_manga(request: BuildRequest, background_tasks: BackgroundTasks):
    """Строит архив манги из JSON"""
    task_id = str(uuid.uuid4())

    # Создаем задачу
    tasks_storage[task_id] = ParseStatus(
        task_id=task_id,
        status="pending",
        progress=0,
        message="Построение архива поставлено в очередь",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat()
    )

    # Добавляем в фоновые задачи
    background_tasks.add_task(
        execute_build_task,
        task_id,
        request.filename,
        request.parser,
        request.branch_id,
        request.archive_type
    )

    return {"task_id": task_id, "status": "pending"}

@app.get("/status/{task_id}")
async def get_task_status(task_id: str):
    """Получает статус задачи"""
    if task_id not in tasks_storage:
        raise HTTPException(status_code=404, detail="Task not found")

    return tasks_storage[task_id]

@app.get("/list-parsed")
async def list_parsed_manga():
    """Возвращает список спаршенных манг"""
    try:
        titles_path = get_melon_base_path() / "Output" / "mangalib" / "titles"
        if not titles_path.exists():
            return {"manga_list": []}

        manga_list = []
        for json_file in titles_path.glob("*.json"):
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                    # Используем правильные поля из JSON структуры манги
                    title = data.get("localized_name") or data.get("eng_name") or data.get("title") or "Неизвестное название"

                    # Получаем автора из списка авторов
                    authors = data.get("authors", [])
                    author = ", ".join(authors) if authors else "Неизвестный автор"

                    # Получаем обложку из списка обложек
                    covers = data.get("covers", [])
                    cover = covers[0].get("link", "") if covers and len(covers) > 0 else ""

                    manga_list.append({
                        "filename": json_file.stem,
                        "title": title,
                        "author": author,
                        "cover": cover,
                        "branches": len(data.get("content", {}))
                    })
            except Exception as e:
                logger.warning(f"Error reading {json_file}: {e}")

        return {"manga_list": manga_list}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/manga-info/{filename}")
async def get_manga_info(filename: str):
    """Получает информацию о спаршенной манге"""
    try:
        json_path = get_melon_base_path() / "Output" / "mangalib" / "titles" / f"{filename}.json"

        if not json_path.exists():
            raise HTTPException(status_code=404, detail="Manga not found")

        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Возвращаем полные данные манги, включая главы
        return data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Добавляем новый эндпоинт для доступа к скачанным изображениях
@app.get("/images/{filename}/{chapter}/{page}")
async def get_chapter_image(filename: str, chapter: str, page: str):
    """Возвращает изображение страницы из архива"""
    try:
        # Формируем путь к изображению - папки называются просто номером главы
        image_path = get_melon_base_path() / "Output" / "mangalib" / "archives" / filename / chapter / f"{page}.png"

        # Также проверяем альтернативные расширения
        if not image_path.exists():
            for ext in ['.jpg', '.jpeg', '.webp']:
                alt_path = image_path.with_suffix(ext)
                if alt_path.exists():
                    image_path = alt_path
                    break

        if not image_path.exists():
            logger.error(f"Image not found: {filename}/{chapter}/{page}")
            raise HTTPException(status_code=404, detail="Image not found")

        # Определяем MIME тип
        mime_type = "image/png"  # По умолчанию PNG, так как в контейнере файлы .png
        if image_path.suffix.lower() == '.jpg' or image_path.suffix.lower() == '.jpeg':
            mime_type = "image/jpeg"
        elif image_path.suffix.lower() == '.webp':
            mime_type = "image/webp"

        # Читаем и возвращаем изображение
        with open(image_path, 'rb') as f:
            image_content = f.read()

        return Response(content=image_content, media_type=mime_type)

    except HTTPException:
        raise  # Перебрасываем HTTP исключения как есть
    except Exception as e:
        logger.error(f"Error serving image {filename}/{chapter}/{page}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/images/list/{filename}")
async def list_manga_images(filename: str):
    """Возвращает список всех доступных изображений для манги"""
    try:
        archives_path = get_melon_base_path() / "Output" / "mangalib" / "archives" / filename

        if not archives_path.exists():
            return {"images": []}

        images = []

        # Проходим по всем папкам глав - папки называются просто номерами (1, 2, 3...)
        for chapter_dir in archives_path.iterdir():
            if chapter_dir.is_dir() and chapter_dir.name.isdigit():
                chapter_num = chapter_dir.name

                # Проходим по всем изображениям в главе
                for image_file in chapter_dir.iterdir():
                    if image_file.is_file() and image_file.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp']:
                        page_num = image_file.stem
                        images.append({
                            "chapter": chapter_num,
                            "page": page_num,
                            "filename": image_file.name,
                            "url": f"/images/{filename}/{chapter_num}/{page_num}"
                        })

        return {"images": images}

    except Exception as e:
        logger.error(f"Error listing images for {filename}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Фоновые задачи
async def execute_parse_task(task_id: str, slug: str, parser: str):
    """Выполняет парсинг манги"""
    try:
        ensure_utf8_patch()
        ensure_cross_device_patch()  # Добавляем новый патч
        update_task_status(task_id, "running", 5, "Применены патчи")

        # Запускаем парсинг
        command = ["python", "main.py", "parse", slug, "--use", parser]
        result = await run_melon_command(command, task_id)

        if result["success"]:
            update_task_status(task_id, "running", 80, "Парсинг завершен, проверяем результат...")

            # Проверяем, создался ли JSON файл
            json_path = get_melon_base_path() / "Output" / parser / "titles" / f"{slug}.json"

            if json_path.exists():
                # Читаем информацию о манге
                with open(json_path, 'r', encoding='utf-8') as f:
                    manga_data = json.load(f)

                update_task_status(
                    task_id,
                    "completed",
                    100,
                    "Парсинг успешно завершен",
                    {
                        "filename": slug,
                        "title": manga_data.get("title", ""),
                        "chapters": sum(len(chapters) for chapters in manga_data.get("content", {}).values()),
                        "branches": len(manga_data.get("content", {}))
                    }
                )
            else:
                update_task_status(task_id, "failed", 100, "Парсинг выполнен, но JSON файл не найден")
        else:
            update_task_status(
                task_id,
                "failed",
                100,
                f"Ошибка парсинга: {result.get('stderr', 'Unknown error')}"
            )

    except Exception as e:
        update_task_status(task_id, "failed", 100, f"Критическая ошибка: {str(e)}")

async def execute_build_task(task_id: str, filename: str, parser: str, branch_id: Optional[str], archive_type: str):
    """Выполняет построение архива манги"""
    try:
        update_task_status(task_id, "running", 10, "Начинаем построение архива...")

        # Применяем патч перед каждым выполнением build команды
        ensure_cross_device_patch()

        # Формируем команду
        command = ["python", "main.py", "build-manga", filename, "--use", parser]

        if branch_id:
            command.extend(["--branch", branch_id])

        if archive_type == "simple":
            command.append("-simple")
        elif archive_type == "zip":
            command.append("-zip")
        elif archive_type == "cbz":
            command.append("-cbz")

        result = await run_melon_command(command, task_id)

        if result["success"]:
            update_task_status(
                task_id,
                "completed",
                100,
                f"Архив успешно построен ({archive_type})",
                {
                    "filename": filename,
                    "archive_type": archive_type,
                    "branch_id": branch_id
                }
            )
        else:
            # Детальное логирование ошибки
            error_msg = f"Ошибка построения: {result.get('stderr', 'Unknown error')}"
            logger.error(f"Build command failed for {filename}: stdout={result.get('stdout', '')}, stderr={result.get('stderr', '')}, return_code={result.get('return_code', 'unknown')}")

            update_task_status(
                task_id,
                "failed",
                100,
                error_msg
            )

    except Exception as e:
        logger.error(f"Critical error in build task {task_id}: {str(e)}")
        update_task_status(task_id, "failed", 100, f"Критическая ошибка: {str(e)}")

# Добавляем эндпоинт для удаления манги
@app.delete("/delete/{filename}")
async def delete_manga(filename: str):
    """Удаляет все данные манги: JSON файл, обложку и папки с изображениями"""
    try:
        deleted_items = []
        errors = []

        # 1. Удаляем JSON файл
        json_path = get_melon_base_path() / "Output" / "mangalib" / "titles" / f"{filename}.json"
        if json_path.exists():
            json_path.unlink()
            deleted_items.append(f"JSON файл: {json_path.name}")

        # 2. Удаляем папку с изображениями из архива
        archives_path = get_melon_base_path() / "Output" / "mangalib" / "archives" / filename
        if archives_path.exists() and archives_path.is_dir():
            shutil.rmtree(archives_path)
            deleted_items.append(f"Папка с изображениями: {archives_path.name}")

        # 3. Удаляем обложку, если есть (может быть в папке images)
        images_path = get_melon_base_path() / "Output" / "mangalib" / "images"
        if images_path.exists():
            for cover_file in images_path.glob(f"{filename}.*"):
                cover_file.unlink()
                deleted_items.append(f"Обложка: {cover_file.name}")

        # 4. Очищаем временные файлы если есть
        temp_path = get_melon_base_path() / "Temp" / "mangalib" / filename
        if temp_path.exists() and temp_path.is_dir():
            shutil.rmtree(temp_path)
            deleted_items.append(f"Временные файлы: {temp_path.name}")

        if not deleted_items:
            return {"success": False, "message": f"Манга '{filename}' не найдена или уже удалена"}

        logger.info(f"Deleted manga '{filename}': {', '.join(deleted_items)}")

        return {
            "success": True,
            "message": f"Манга '{filename}' успешно удалена",
            "deleted_items": deleted_items
        }

    except Exception as e:
        error_msg = f"Ошибка при удалении манги '{filename}': {str(e)}"
        logger.error(error_msg)
        return {"success": False, "message": error_msg}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8084)
