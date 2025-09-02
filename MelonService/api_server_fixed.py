import asyncio
import json
import logging
import os
import shutil
import subprocess
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Модели данных
class ParseRequest(BaseModel):
    slug: str
    parser: str = "newtoki"

class BuildRequest(BaseModel):
    slug: str
    parser: str = "newtoki"
    type: str = "simple"

class BatchParseRequest(BaseModel):
    slugs: List[str]
    parser: str = "newtoki"
    auto_import: bool = True

class ParseStatus(BaseModel):
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
    builder_path = get_melon_base_path() / "Parsers" / "MangaBuilder.py"
    
    if builder_path.exists():
        content = builder_path.read_text(encoding='utf-8')
        # Заменяем os.rename на shutil.move для cross-device операций
        if "os.rename(" in content and "shutil.move(" not in content:
            logger.info("Applying cross-device patch to MangaBuilder...")
            content = content.replace("os.rename(", "shutil.move(")
            if "import shutil" not in content:
                content = "import shutil\n" + content
            builder_path.write_text(content, encoding='utf-8')
            logger.info("Cross-device patch applied successfully")

def update_task_status(task_id: str, status: str, progress: int, message: str):
    """Обновляет статус задачи"""
    if task_id in tasks_storage:
        tasks_storage[task_id].status = status
        tasks_storage[task_id].progress = progress
        tasks_storage[task_id].message = message
        tasks_storage[task_id].updated_at = datetime.now().isoformat()

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
                command = ["python", "main.py", "parse", slug, "--use", parser]
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
    return {"message": "MelonService API Server", "status": "running"}

@app.post("/parse")
async def parse_manga(request: ParseRequest):
    """Парсинг одной манги"""
    task_id = str(uuid.uuid4())
    
    # Создаем новую задачу
    task = ParseStatus(
        task_id=task_id,
        status="pending",
        progress=0,
        message=f"Парсинг манги {request.slug}",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
        total_slugs=1,
        completed_slugs=0,
        failed_slugs=0
    )
    
    tasks_storage[task_id] = task
    
    # Запускаем задачу асинхронно
    asyncio.create_task(execute_parse_task(task_id, request.slug, request.parser))
    
    return {"task_id": task_id, "status": "started"}

@app.post("/batch-start")
async def start_batch_parse(request: BatchParseRequest):
    """Запускает пакетный парсинг списка манги"""
    task_id = str(uuid.uuid4())
    
    # Создаем новую задачу
    task = BatchParseStatus(
        task_id=task_id,
        status="pending",
        progress=0,
        message=f"Подготовка к пакетному парсингу {len(request.slugs)} манги",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
        total_slugs=len(request.slugs),
        completed_slugs=0,
        failed_slugs=0
    )
    
    tasks_storage[task_id] = task
    
    # Запускаем задачу асинхронно
    asyncio.create_task(execute_batch_parse_task(task_id, request.slugs, request.parser, request.auto_import))
    
    return {"task_id": task_id, "status": "started"}

@app.get("/status/{task_id}")
async def get_task_status(task_id: str):
    """Получение статуса задачи"""
    if task_id not in tasks_storage:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = tasks_storage[task_id]
    result = {
        "task_id": task.task_id,
        "status": task.status,
        "progress": task.progress,
        "message": task.message,
        "created_at": task.created_at,
        "updated_at": task.updated_at,
        "total_slugs": task.total_slugs,
        "completed_slugs": task.completed_slugs,
        "failed_slugs": task.failed_slugs,
        "current_slug": task.current_slug,
        "results": task.results
    }
    
    # Добавляем информацию о состоянии билда, если доступна
    if task_id in build_states:
        result["build_state"] = build_states[task_id]
    
    return result

async def execute_parse_task(task_id: str, slug: str, parser: str):
    """Выполняет задачу парсинга одной манги"""
    try:
        ensure_utf8_patch()
        ensure_cross_device_patch()
        
        # Обновляем статус начала
        update_task_status(task_id, "PARSING", 10, f"Парсинг манги {slug}")
        
        command = ["python", "main.py", "parse", slug, "--use", parser]
        result = await run_melon_command(command, task_id, timeout=1800)
        
        if result["success"]:
            # Проверяем, создался ли JSON файл
            json_path = get_melon_base_path() / "Output" / parser / "titles" / f"{slug}.json"
            if json_path.exists():
                update_task_status(task_id, "COMPLETED", 100, f"Парсинг манги {slug} успешно завершен")
                
                # Автоматически запускаем билд
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

async def execute_build_task(task_id: str, slug: str, parser: str, target_language: str = None, build_type: str = "simple"):
    """Выполняет задачу билда одной манги"""
    try:
        update_task_status(task_id, "BUILDING", 50, f"Билдинг манги {slug}")
        
        # Команда билда
        command = ["python", "main.py", "build-manga", slug, "--use", parser, f"-{build_type}"]
        
        result = await run_melon_command(command, task_id, timeout=1800)
        
        if result["success"]:
            update_task_status(task_id, "COMPLETED", 100, f"Билд манги {slug} завершен")
        else:
            update_task_status(
                task_id,
                "FAILED",
                100,
                f"Ошибка билда: {result.get('stderr', 'Unknown error')}"
            )

    except Exception as e:
        update_task_status(task_id, "FAILED", 100, f"Критическая ошибка билда: {str(e)}")

@app.get("/list-parsed")
async def list_parsed_manga():
    """Получение списка спарсенных манг"""
    try:
        output_path = get_melon_base_path() / "Output"
        parsed_manga = []
        
        for parser_dir in output_path.iterdir():
            if parser_dir.is_dir():
                titles_dir = parser_dir / "titles"
                if titles_dir.exists():
                    for json_file in titles_dir.glob("*.json"):
                        try:
                            with open(json_file, 'r', encoding='utf-8') as f:
                                manga_data = json.load(f)
                                parsed_manga.append({
                                    "slug": json_file.stem,
                                    "title": manga_data.get("title", "Unknown"),
                                    "parser": parser_dir.name,
                                    "chapters": sum(len(chapters) for chapters in manga_data.get("content", {}).values()),
                                    "branches": len(manga_data.get("content", {}))
                                })
                        except Exception as e:
                            logger.warning(f"Error reading {json_file}: {str(e)}")
        
        return {"manga": parsed_manga}
    
    except Exception as e:
        logger.error(f"Error listing parsed manga: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/delete/{filename}")
async def delete_manga(filename: str):
    """Удаление манги"""
    try:
        output_path = get_melon_base_path() / "Output"
        deleted_items = []
        
        for parser_dir in output_path.iterdir():
            if parser_dir.is_dir():
                # Удаляем JSON файл
                json_file = parser_dir / "titles" / f"{filename}.json"
                if json_file.exists():
                    json_file.unlink()
                    deleted_items.append(f"JSON файл: {json_file.name}")
                
                # Удаляем папку с изображениями
                images_dir = parser_dir / "archives" / filename
                if images_dir.exists():
                    shutil.rmtree(images_dir)
                    deleted_items.append(f"Папка с изображениями: {filename}")
        
        if deleted_items:
            logger.info(f"Deleted manga '{filename}': {', '.join(deleted_items)}")
            return {
                "success": True,
                "message": f"Манга '{filename}' успешно удалена",
                "deleted_items": deleted_items
            }
        else:
            return {
                "success": False,
                "message": f"Манга '{filename}' не найдена"
            }
    
    except Exception as e:
        error_msg = f"Ошибка при удалении манги '{filename}': {str(e)}"
        logger.error(error_msg)
        return {"success": False, "message": error_msg}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8084)
