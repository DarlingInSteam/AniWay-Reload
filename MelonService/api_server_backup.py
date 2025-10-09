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
import requests

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="MelonService API", version="1.0.0")

# Базовые модели
class ParseRequest(BaseModel):
    slug: str
    parser: str = "mangalib"

class BatchParseRequest(BaseModel):
    slugs: List[str]
    parser: str = "mangalib"
    auto_import: bool = True  # Автоматически импортировать в систему после парсинга

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

class BatchParseStatus(BaseModel):
    task_id: str
    status: str  # pending, running, completed, failed
    progress: int
    message: str
    created_at: str
    updated_at: str
    total_slugs: int
    completed_slugs: int
    failed_slugs: int
    current_slug: Optional[str] = None
    results: List[Dict[str, Any]] = []

# Глобальное хранилище задач (в production лучше использовать Redis)
tasks_storage: Dict[str, ParseStatus] = {}

# Хранилище состояний билда для синхронизации
build_states: Dict[str, Dict[str, Any]] = {}  # task_id -> {"slug": str, "is_ready": bool, "files_ready": bool}

# Вспомогательные функции
def get_melon_base_path() -> Path:
    return Path("/app")

async def check_build_completion(slug: str, parser: str, max_attempts: int = 150, interval: int = 2) -> Dict[str, Any]:
    """
    Проверяет готовность файлов после билда
    Возвращает {"ready": bool, "json_exists": bool, "archive_exists": bool, "error": str}
    """
    json_path = get_melon_base_path() / "Output" / parser / "titles" / f"{slug}.json"
    archive_path = get_melon_base_path() / "Output" / parser / "archives" / slug
    
    for attempt in range(max_attempts):
        json_exists = json_path.exists()
        archive_exists = archive_path.exists()
        
        # Логируем каждые 10 попыток для уменьшения спама
        if attempt % 10 == 0 or attempt == max_attempts - 1:
            logger.info(f"Build check for {slug} (attempt {attempt + 1}/{max_attempts}): JSON={json_exists}, Archive={archive_exists}")
            if not json_exists:
                logger.info(f"JSON file not found at: {json_path}")
                # Проверим, существует ли директория
                titles_dir = json_path.parent
                if titles_dir.exists():
                    files_in_titles = list(titles_dir.glob("*.json"))
                    logger.info(f"Files in titles directory: {[f.name for f in files_in_titles[:5]]}")  # Первые 5 файлов
                else:
                    logger.info(f"Titles directory does not exist: {titles_dir}")
        
        if json_exists:
            # JSON файл есть, проверяем его валидность
            try:
                with open(json_path, 'r', encoding='utf-8') as f:
                    manga_data = json.load(f)
                    # Проверяем, что файл содержит основные поля
                    if manga_data.get("title") and manga_data.get("content"):
                        logger.info(f"Build completed for {slug}: {manga_data.get('title')}")
                        return {
                            "ready": True,
                            "json_exists": True,
                            "archive_exists": archive_exists,
                            "manga_data": manga_data,
                            "error": None
                        }
            except Exception as e:
                logger.warning(f"JSON file exists but is invalid for {slug}: {str(e)}")
        
        if attempt < max_attempts - 1:  # Не ждем на последней попытке
            await asyncio.sleep(interval)
    
    return {
        "ready": False,
        "json_exists": json_exists,
        "archive_exists": archive_exists,
        "error": f"Build not completed after {max_attempts * interval} seconds"
    }

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

def send_progress_to_manga_service(task_id, status, progress, message=None, error=None):
    try:
        payload = {
            "status": status,
            "progress": progress,
            "message": message,
            "error": error
        }
        url = f"http://manga-service:8081/api/parser/progress/{task_id}"
        resp = requests.post(url, json=payload, timeout=5)
        logger.info(f"Progress sent to MangaService: {payload}, response: {resp.status_code}")
    except Exception as e:
        logger.error(f"Failed to send progress to MangaService: {e}")

def update_task_status(task_id: str, status: str, progress: int, message: str, result: Optional[Dict] = None, error: Optional[str] = None):
    """Обновляет статус задачи"""
    if task_id in tasks_storage:
        tasks_storage[task_id].status = status
        tasks_storage[task_id].progress = progress
        tasks_storage[task_id].message = message
        tasks_storage[task_id].updated_at = datetime.now().isoformat()
        if result:
            tasks_storage[task_id].result = result
        send_progress_to_manga_service(task_id, status, progress, message, error)

async def run_melon_command(command: List[str], task_id: str, timeout: int = 600) -> Dict[str, Any]:
    """Запускает команду MelonService асинхронно с поддержкой timeout"""
    try:
        # Активируем виртуальное окружение и запускаем команду
        base_path = get_melon_base_path()

        # Для Windows в Docker используем python напрямую
        full_command = ["python", "main.py"] + command[2:]  # убираем "python main.py"

        logger.info(f"Running command: {' '.join(full_command)}")
        update_task_status(task_id, "IMPORTING_MANGA", 10, "Executing Melon command...")

        # Запускаем процесс с timeout
        process = await asyncio.create_subprocess_exec(
            *full_command,
            cwd=base_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            return {
                "success": False,
                "stdout": "",
                "stderr": f"Command timed out after {timeout} seconds"
            }

        if process.returncode == 0:
            logger.info("Command completed successfully")
            return {
                "success": True,
                "stdout": stdout.decode('utf-8', errors='ignore'),
                "stderr": stderr.decode('utf-8', errors='ignore')
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

    status = tasks_storage[task_id]
    
    # Добавляем информацию о состоянии билда, если есть
    if task_id in build_states:
        build_state = build_states[task_id]
        # Добавляем дополнительную информацию в ответ
        response = status.dict()
        response["build_state"] = {
            "current_slug": build_state.get("current_slug"),
            "is_ready": build_state.get("is_ready", False),
            "files_ready": build_state.get("files_ready", False)
        }
        return response
    
    return status

@app.post("/batch-parse")
async def batch_parse_manga(request: BatchParseRequest, background_tasks: BackgroundTasks):
    """Запускает пакетный парсинг списка манги с автоматическим импортом"""
    task_id = str(uuid.uuid4())

    # Создаем задачу для пакетного парсинга
    tasks_storage[task_id] = BatchParseStatus(
        task_id=task_id,
        status="pending",
        progress=0,
        message="Пакетный парсинг поставлен в очередь",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
        total_slugs=len(request.slugs),
        completed_slugs=0,
        failed_slugs=0,
        results=[]
    )

    # Добавляем в фоновые задачи
    background_tasks.add_task(
        execute_batch_parse_task,
        task_id,
        request.slugs,
        request.parser,
        request.auto_import
    )

    return {"task_id": task_id, "status": "pending", "total_slugs": len(request.slugs)}

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

# Добавляем новый эндпо��нт для получения обложки как файла
@app.get("/cover/{filename}")
async def get_manga_cover(filename: str):
    """Возвращает обложку манги как файл ��з папки images/{slug}/covers/"""
    try:
        # Правильный путь к обложкам: Output/mangalib/images/{slug}/covers/
        covers_path = get_melon_base_path() / "Output" / "mangalib" / "images" / filename / "covers"

        if not covers_path.exists():
            logger.error(f"Covers directory not found for manga: {filename}")
            raise HTTPException(status_code=404, detail="Cover directory not found")

        # Ищем любой файл обложки в папке covers
        cover_path = None
        for ext in ['.jpg', '.jpeg', '.png', '.webp']:
            # Ищем файлы с нужным расширением в папке covers
            for cover_file in covers_path.glob(f"*{ext}"):
                if cover_file.is_file():
                    cover_path = cover_file
                    break
            if cover_path:
                break

        if not cover_path:
            logger.error(f"Cover file not found for manga: {filename} in {covers_path}")
            raise HTTPException(status_code=404, detail="Cover file not found")

        # Определяем MIME тип
        mime_type = "image/jpeg"  # По умолчанию
        if cover_path.suffix.lower() == '.png':
            mime_type = "image/png"
        elif cover_path.suffix.lower() == '.webp':
            mime_type = "image/webp"

        # Читаем и возвращаем обложку
        with open(cover_path, 'rb') as f:
            cover_content = f.read()

        logger.info(f"Successfully serving cover for manga: {filename} from {cover_path}")
        return Response(content=cover_content, media_type=mime_type)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving cover {filename}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Фоновые задачи
async def execute_parse_task(task_id: str, slug: str, parser: str):
    """Выполняет парсинг манги"""
    try:
        ensure_utf8_patch()
        ensure_cross_device_patch()  # Добавляем новый патч
        update_task_status(task_id, "IMPORTING_MANGA", 5, "Применены патчи")

        # Запускаем парсинг
    command = ["python", "main.py", "parse", slug, "-skip-images", "--use", parser]
        result = await run_melon_command(command, task_id)

        if result["success"]:
            update_task_status(task_id, "IMPORTING_MANGA", 80, "Парсинг завершен, проверяем результат...")

            # Проверяем, создался ли JSON файл
            json_path = get_melon_base_path() / "Output" / parser / "titles" / f"{slug}.json"

            if json_path.exists():
                # Читаем информацию о манге
                with open(json_path, 'r', encoding='utf-8') as f:
                    manga_data = json.load(f)

                update_task_status(
                    task_id,
                    "COMPLETED",
                    100,
                    "Парсинг успешно завершен",
                    {
                        "filename": slug,
                        "title": manga_data.get("title", ""),
                        "chapters": sum(len(chapters) for chapters in manga_data.get("content", {}).values()),
                        "branches": len(manga_data.get("content", {}))
                    }
                )

                # Автоматически запускаем build после успешного парсинга
                # Параметры: task_id, filename, parser, branch_id=None, archive_type="zip"
                import asyncio
                asyncio.create_task(execute_build_task(task_id, slug, parser, None, "simple"))
            else:
                update_task_status(task_id, "FAILED", 100, "Парсинг выполнен, но JSON файл не найден")
        else:
            update_task_status(
                task_id,
                "FAILED",
                100,
                f"Ошибка парсинга: {result.get('stderr', 'Unknown error')}"
            )

    except Exception as e:
        update_task_status(task_id, "FAILED", 100, f"Критическая ошибка: {str(e)}")

async def execute_batch_parse_task(task_id: str, slugs: List[str], parser: str, auto_import: bool):
    """Выполняет пакетный парсинг списка манги с отдельным этапом импорта"""
    try:
        ensure_utf8_patch()
        ensure_cross_device_patch()
        
        total_slugs = len(slugs)
        results = []
        completed = 0
        failed = 0
        successfully_built = []  # Список успешно собранных манг для импорта
        
        # Инициализируем состояние билда для задачи
        build_states[task_id] = {"current_slug": None, "is_ready": False, "files_ready": False}
        
        # Обновляем статус начала
        tasks_storage[task_id].status = "running"
        tasks_storage[task_id].message = f"Начинаем пакетный парсинг и билд {total_slugs} манги"
        tasks_storage[task_id].updated_at = datetime.now().isoformat()
        
        # ЭТАП 1: Парсинг и билд всех манг
        logger.info(f"Starting batch parse and build phase for {total_slugs} manga")
        
        for i, slug in enumerate(slugs):
            try:
                # Сбрасываем состояние для новой манги
                build_states[task_id].update({
                    "current_slug": slug,
                    "is_ready": False,
                    "files_ready": False
                })
                
                # Обновляем текущий слаг
                tasks_storage[task_id].current_slug = slug
                tasks_storage[task_id].message = f"Парсинг: {slug} ({i+1}/{total_slugs})"
                tasks_storage[task_id].progress = int((i / total_slugs) * 35)  # 35% для парсинга и билда
                tasks_storage[task_id].updated_at = datetime.now().isoformat()
                
                logger.info(f"Batch parsing: processing {slug} ({i+1}/{total_slugs})")
                
                # Шаг 1: Парсинг
                command = ["python", "main.py", "parse", slug, "-skip-images", "--use", parser]
                result = await run_melon_command(command, task_id, timeout=1800)  # 30 минут таймаут
                
                if not result["success"]:
                    failed += 1
                    results.append({
                        "slug": slug,
                        "status": "failed",
                        "step": "parse",
                        "error": result.get('stderr', 'Unknown parse error')
                    })
                    continue
                
                # Шаг 2: Построение архива
                tasks_storage[task_id].message = f"Билдинг: {slug} ({i+1}/{total_slugs})"
                tasks_storage[task_id].updated_at = datetime.now().isoformat()
                
                build_command = ["python", "main.py", "build-manga", slug, "--use", parser, "-simple"]
                build_result = await run_melon_command(build_command, task_id, timeout=1800)  # 30 минут таймаут
                
                if not build_result["success"]:
                    failed += 1
                    results.append({
                        "slug": slug,
                        "status": "failed",
                        "step": "build",
                        "error": build_result.get('stderr', 'Unknown build error')
                    })
                    continue
                
                # Добавляем в список успешно собранных
                successfully_built.append(slug)
                logger.info(f"Successfully built {slug}")
                
            except Exception as e:
                failed += 1
                results.append({
                    "slug": slug,
                    "status": "failed",
                    "step": "general",
                    "error": str(e)
                })
                logger.error(f"Error processing {slug}: {str(e)}")
        
        # ЭТАП 2: Импорт всех успешно собранных манг
        if auto_import and successfully_built:
            logger.info(f"Starting import phase for {len(successfully_built)} successfully built manga")
            
            # Даем время для завершения всех операций записи файлов
            tasks_storage[task_id].message = f"Ожидание завершения записи файлов..."
            tasks_storage[task_id].progress = 40
            tasks_storage[task_id].updated_at = datetime.now().isoformat()
            await asyncio.sleep(10)  # 10 секунд для завершения I/O операций
            
            for i, slug in enumerate(successfully_built):
                try:
                    tasks_storage[task_id].current_slug = slug
                    tasks_storage[task_id].message = f"Импорт: {slug} ({i+1}/{len(successfully_built)})"
                    tasks_storage[task_id].progress = 40 + int((i / len(successfully_built)) * 55)  # 40-95% для импорта
                    tasks_storage[task_id].updated_at = datetime.now().isoformat()
                    
                    logger.info(f"Starting import for {slug}")
                    
                    # Отправляем запрос на импорт в MangaService
                    import_url = "http://manga-service:8081/parser/import/" + slug
                    response = requests.post(import_url, timeout=180)  # 3 минуты таймаут для импорта
                    
                    # Найдем соответствующий результат и обновим его
                    result_entry = None
                    for result in results:
                        if result.get("slug") == slug and result.get("status") == "completed":
                            result_entry = result
                            break
                    
                    if not result_entry:
                        # Создаем новую запись для успешно собранной манги
                        result_entry = {
                            "slug": slug,
                            "status": "completed",
                            "manga_info": {},
                            "imported": True
                        }
                        results.append(result_entry)
                    
                    if response.status_code == 200:
                        import_data = response.json()
                        logger.info(f"Successfully imported {slug}")
                        result_entry["import_status"] = "success"
                        result_entry["manga_info"].update({
                            "title": import_data.get("title", ""),
                            "chapters": import_data.get("chapters", 0),
                            "import_result": import_data
                        })
                        completed += 1
                    else:
                        logger.warning(f"Failed to import {slug}: HTTP {response.status_code}")
                        result_entry["import_status"] = "failed"
                        result_entry["import_error"] = f"Import failed with HTTP {response.status_code}"
                        result_entry["import_response"] = response.text[:200] if response.text else "No response body"
                        
                except Exception as e:
                    logger.error(f"Failed to import {slug}: {str(e)}")
                    # Обновляем результат с ошибкой импорта
                    for result in results:
                        if result.get("slug") == slug:
                            result["import_status"] = "failed"
                            result["import_error"] = str(e)
                            break
        
        # Финальное обновление статуса
        tasks_storage[task_id].message = f"Пакетный парсинг завершен. Успешно: {completed}, Ошибок: {failed}"
        tasks_storage[task_id].progress = 100
        tasks_storage[task_id].status = "completed"
        tasks_storage[task_id].completed_slugs = completed
        tasks_storage[task_id].failed_slugs = failed
        tasks_storage[task_id].results = results
        tasks_storage[task_id].updated_at = datetime.now().isoformat()
        
        logger.info(f"Batch parsing completed. Successful: {completed}, Failed: {failed}")
        
        # Очищаем состояние билда
        if task_id in build_states:
            del build_states[task_id]

    except Exception as e:
        update_task_status(task_id, "FAILED", 100, f"Критическая ошибка: {str(e)}")
        logger.error(f"Critical error in batch parsing: {str(e)}")

# Эндпоинты

@app.get("/")
async def get_main():
                tasks_storage[task_id].progress = int((i / total_slugs) * 50 + 25)  # 25-75% для билда
                tasks_storage[task_id].updated_at = datetime.now().isoformat()
                
                build_command = ["python", "main.py", "build-manga", slug, "--use", parser, "-simple"]
                build_result = await run_melon_command(build_command, task_id, timeout=1800)  # 30 минут таймаут
                
                if not build_result["success"]:
                    failed += 1
                    results.append({
                        "slug": slug,
                        "status": "failed",
                        "step": "build",
                        "error": build_result.get('stderr', 'Unknown build error')
                    })
                    continue
                
                # Шаг 3: Проверка готовности билда
                tasks_storage[task_id].message = f"Проверка готовности: {slug} ({i+1}/{total_slugs})"
                tasks_storage[task_id].progress = int((i / total_slugs) * 75 + 15)  # 75-90% для проверки
                tasks_storage[task_id].updated_at = datetime.now().isoformat()
                
                logger.info(f"Starting build verification for {slug}")
                logger.info(f"Expected JSON path: {get_melon_base_path() / 'Output' / parser / 'titles' / f'{slug}.json'}")
                logger.info(f"Expected archive path: {get_melon_base_path() / 'Output' / parser / 'archives' / slug}")
                
                # Проверяем готовность файлов
                build_check = await check_build_completion(slug, parser)
                
                logger.info(f"Build check result for {slug}: {build_check}")
                
                if not build_check["ready"]:
                    failed += 1
                    results.append({
                        "slug": slug,
                        "status": "failed",
                        "step": "build_verification",
                        "error": build_check["error"]
                    })
                    continue
                
                # Помечаем билд как готовый
                build_states[task_id]["is_ready"] = True
                build_states[task_id]["files_ready"] = True
                
                # Шаг 4: Автоматический импорт (если включен)
                manga_info = None
                if auto_import:
                    tasks_storage[task_id].message = f"Импорт: {slug} ({i+1}/{total_slugs})"
                    tasks_storage[task_id].progress = int((i / total_slugs) * 95 + 5)  # 90-95% для импорта
                    tasks_storage[task_id].updated_at = datetime.now().isoformat()
                    
                    try:
                        manga_data = build_check["manga_data"]
                        
                        logger.info(f"Starting import for {slug}: {manga_data.get('title', 'Unknown')}")
                        
                        # Отправляем запрос на импорт в MangaService
                        import_url = "http://manga-service:8081/parser/import/" + slug
                        response = requests.post(import_url, timeout=180)  # 3 минуты таймаут для импорта
                        
                        if response.status_code == 200:
                            import_data = response.json()
                            logger.info(f"Successfully imported {slug}")
                            manga_info = {
                                "title": manga_data.get("title", ""),
                                "chapters": sum(len(chapters) for chapters in manga_data.get("content", {}).values()),
                                "branches": len(manga_data.get("content", {})),
                                "import_result": import_data
                            }
                        else:
                            logger.warning(f"Failed to import {slug}: HTTP {response.status_code}")
                            manga_info = {
                                "error": f"Import failed with HTTP {response.status_code}",
                                "response": response.text[:200] if response.text else "No response body"
                            }
                    except Exception as e:
                        logger.error(f"Failed to import {slug}: {str(e)}")
                        manga_info = {"error": str(e)}
                    
                    # Сбрасываем состояние после завершения импорта
                    build_states[task_id]["is_ready"] = False
                    build_states[task_id]["files_ready"] = False
                else:
                    # Если импорт отключен, всё равно сбрасываем состояние
                    build_states[task_id]["is_ready"] = False
                    build_states[task_id]["files_ready"] = False
                
                completed += 1
                result_entry = {
                    "slug": slug,
                    "status": "completed",
                    "manga_info": manga_info,
                    "imported": auto_import
                }
                
                # Добавляем статус импорта
                if auto_import and manga_info:
                    if "error" in manga_info:
                        result_entry["import_status"] = "failed"
                        result_entry["import_error"] = manga_info["error"]
                    else:
                        result_entry["import_status"] = "success"
                else:
                    result_entry["import_status"] = "skipped"
                
                results.append(result_entry)
                
                # Обновляем счетчики
                tasks_storage[task_id].completed_slugs = completed
                tasks_storage[task_id].failed_slugs = failed
                tasks_storage[task_id].results = results
                
            except Exception as e:
                failed += 1
                results.append({
                    "slug": slug,
                    "status": "failed",
                    "step": "general",
                    "error": str(e)
                })
                logger.error(f"Error processing {slug}: {str(e)}")
                
                # Сбрасываем состояние при ошибке
                build_states[task_id]["is_ready"] = False
                build_states[task_id]["files_ready"] = False
        
        # Финальное обновление статуса
        tasks_storage[task_id].status = "completed"
        tasks_storage[task_id].progress = 100
        tasks_storage[task_id].message = f"Пакетный парсинг завершен. Успешно: {completed}, Ошибок: {failed}"
        tasks_storage[task_id].completed_slugs = completed
        tasks_storage[task_id].failed_slugs = failed
        tasks_storage[task_id].results = results
        tasks_storage[task_id].current_slug = None
        tasks_storage[task_id].updated_at = datetime.now().isoformat()
        
        # Очищаем состояние билда
        if task_id in build_states:
            del build_states[task_id]
        
        logger.info(f"Batch parsing completed. Successful: {completed}, Failed: {failed}")
        
    except Exception as e:
        tasks_storage[task_id].status = "failed"
        tasks_storage[task_id].message = f"Критическая ошибка пакетного парсинга: {str(e)}"
        tasks_storage[task_id].updated_at = datetime.now().isoformat()
        
        # Очищаем состояние билда при ошибке
        if task_id in build_states:
            del build_states[task_id]
        
        logger.error(f"Critical error in batch parsing: {str(e)}")

async def execute_build_task(task_id: str, filename: str, parser: str, branch_id: Optional[str], archive_type: str):
    """Выполняет построение архива манги"""
    try:
        update_task_status(task_id, "IMPORTING_MANGA", 10, "Начинаем построение архива...")

        # Применяем патч перед каждым выполнением build команды
        ensure_cross_device_patch()

        # ��ормируем команду
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
                "COMPLETED",
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
                "FAILED",
                100,
                error_msg
            )

    except Exception as e:
        logger.error(f"Critical error in build task {task_id}: {str(e)}")
        update_task_status(task_id, "FAILED", 100, f"Критическая ошибка: {str(e)}")

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
