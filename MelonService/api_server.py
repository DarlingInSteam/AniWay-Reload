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
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, Response, StreamingResponse
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

class LogEntry(BaseModel):
    timestamp: str
    level: str
    message: str
    task_id: Optional[str] = None

# Глобальное хранилище задач (в production лучше использовать Redis)
tasks_storage: Dict[str, ParseStatus] = {}

# Хранилище логов для задач
task_logs: Dict[str, List[LogEntry]] = {}

# Хранилище состояний билда для синхронизации
build_states: Dict[str, Dict[str, Any]] = {}  # task_id -> {"slug": str, "is_ready": bool, "files_ready": bool}

# Вспомогательные функции
def get_melon_base_path() -> Path:
    return Path("/app")

def log_task_message(task_id: str, level: str, message: str):
    """Добавляет сообщение в логи задачи"""
    if task_id not in task_logs:
        task_logs[task_id] = []
    
    log_entry = LogEntry(
        timestamp=datetime.now().isoformat(),
        level=level,
        message=message,
        task_id=task_id
    )
    
    task_logs[task_id].append(log_entry)
    
    # Ограничиваем количество логов (последние 1000)
    if len(task_logs[task_id]) > 1000:
        task_logs[task_id] = task_logs[task_id][-1000:]

def update_task_status(task_id: str, status: str, progress: int, message: str, result_data: Dict[str, Any] = None):
    """Обновляет статус задачи"""
    if task_id in tasks_storage:
        tasks_storage[task_id].status = status
        tasks_storage[task_id].progress = progress
        tasks_storage[task_id].message = message
        tasks_storage[task_id].updated_at = datetime.now().isoformat()
        
        # Логируем изменение статуса
        log_task_message(task_id, "INFO", f"Status: {status}, Progress: {progress}%, Message: {message}")
        
        if result_data:
            if hasattr(tasks_storage[task_id], 'results'):
                tasks_storage[task_id].results.append(result_data)
            elif hasattr(tasks_storage[task_id], 'current_slug'):
                tasks_storage[task_id].current_slug = result_data.get('filename', '')
        
        logger.info(f"Task {task_id}: {status} - {progress}% - {message}")
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
    """Запускает команду MelonService асинхронно с поддержкой timeout и логирования в реальном времени"""
    try:
        # Активируем виртуальное окружение и запускаем команду
        base_path = get_melon_base_path()

        # Для Windows в Docker используем python напрямую
        full_command = ["python", "main.py"] + command[2:]  # убираем "python main.py"

        logger.info(f"Running command: {' '.join(full_command)}")
        update_task_status(task_id, "RUNNING", 5, f"Запуск команды: {' '.join(full_command)}")

        # Запускаем процесс с timeout
        process = await asyncio.create_subprocess_exec(
            *full_command,
            cwd=base_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )

        # Читаем вывод в реальном времени
        stdout_lines = []
        stderr_lines = []
        
        # Читаем stdout
        if process.stdout:
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                line_str = line.decode('utf-8', errors='ignore').strip()
                if line_str:
                    stdout_lines.append(line_str)
                    log_task_message(task_id, "INFO", line_str)
                    
                    # Обновляем прогресс на основе вывода
                    if "Chapter" in line_str and "completed" in line_str:
                        # Пример: "[1/10] Chapter 1.1 completed (15 slides)"
                        update_task_status(task_id, "RUNNING", min(90, 10 + len(stdout_lines)), f"Парсинг: {line_str}")
                    elif "Parsing" in line_str and "..." in line_str:
                        update_task_status(task_id, "RUNNING", min(90, 10 + len(stdout_lines)), f"Парсинг: {line_str}")
                    elif "Building" in line_str:
                        update_task_status(task_id, "RUNNING", min(90, 10 + len(stdout_lines)), f"Билдинг: {line_str}")
                    elif "Done in" in line_str:
                        update_task_status(task_id, "RUNNING", 95, f"Завершено: {line_str}")

        # Читаем stderr
        if process.stderr:
            while True:
                line = await process.stderr.readline()
                if not line:
                    break
                line_str = line.decode('utf-8', errors='ignore').strip()
                if line_str:
                    stderr_lines.append(line_str)
                    logger.warning(f"[{task_id}] STDERR: {line_str}")

        # Ждем завершения процесса
        return_code = await process.wait()

        stdout = '\n'.join(stdout_lines)
        stderr = '\n'.join(stderr_lines)

        if return_code == 0:
            logger.info(f"[{task_id}] Command completed successfully")
            update_task_status(task_id, "RUNNING", 95, "Команда выполнена успешно")
            return {
                "success": True,
                "stdout": stdout,
                "stderr": stderr
            }
        else:
            logger.error(f"[{task_id}] Command failed with return code {return_code}")
            return {
                "success": False,
                "stdout": stdout,
                "stderr": stderr,
                "return_code": return_code
            }

    except Exception as e:
        logger.error(f"[{task_id}] Error running command: {str(e)}")
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

@app.get("/tasks")
async def get_all_tasks():
    """Получение списка всех задач"""
    tasks = []
    for task_id, task in tasks_storage.items():
        task_dict = {
            "task_id": task.task_id,
            "status": task.status,
            "progress": task.progress,
            "message": task.message,
            "created_at": task.created_at,
            "updated_at": task.updated_at,
            "total_slugs": getattr(task, 'total_slugs', 1),
            "completed_slugs": getattr(task, 'completed_slugs', 0),
            "failed_slugs": getattr(task, 'failed_slugs', 0),
            "current_slug": getattr(task, 'current_slug', None),
        }
        tasks.append(task_dict)
    
    # Сортируем по времени создания (новые сверху)
    tasks.sort(key=lambda x: x['created_at'], reverse=True)
    return tasks

@app.post("/tasks/clear-completed")
async def clear_completed_tasks():
    """Очистка завершенных и неудачных задач"""
    completed_tasks = []
    for task_id, task in list(tasks_storage.items()):
        if task.status in ["completed", "failed"]:
            completed_tasks.append(task_id)
            del tasks_storage[task_id]
            if task_id in task_logs:
                del task_logs[task_id]
            if task_id in build_states:
                del build_states[task_id]
    
    return {"cleared": len(completed_tasks), "task_ids": completed_tasks}

@app.get("/")
async def get_main():
    return {"message": "MelonService API Server", "status": "running", "monitor": "/monitor.html"}

@app.post("/parse")
async def parse_manga(request: ParseRequest, background_tasks: BackgroundTasks):
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
    
    # Запускаем задачу через BackgroundTasks
    background_tasks.add_task(execute_parse_task, task_id, request.slug, request.parser)
    
    return {"task_id": task_id, "status": "pending"}

@app.post("/build")
async def build_manga(request: BuildRequest, background_tasks: BackgroundTasks):
    """Билд одной манги"""
    task_id = str(uuid.uuid4())
    
    # Создаем новую задачу
    task = ParseStatus(
        task_id=task_id,
        status="pending",
        progress=0,
        message=f"Билд манги {request.slug}",
        created_at=datetime.now().isoformat(),
        updated_at=datetime.now().isoformat(),
        total_slugs=1,
        completed_slugs=0,
        failed_slugs=0
    )
    
    tasks_storage[task_id] = task
    
    # Запускаем задачу через BackgroundTasks
    background_tasks.add_task(execute_build_task, task_id, request.slug, request.parser, None, request.type)
    
    return {"task_id": task_id, "status": "pending"}

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

@app.post("/batch-parse")
async def batch_parse_alias(request: BatchParseRequest):
    """Алиас для batch-start - запускает пакетный парсинг списка манги"""
    return await start_batch_parse(request)

@app.get("/logs/{task_id}")
async def get_task_logs(task_id: str, limit: int = 100):
    """Получение логов задачи"""
    if task_id not in task_logs:
        raise HTTPException(status_code=404, detail="Task logs not found")
    
    logs = task_logs[task_id]
    if limit > 0:
        logs = logs[-limit:]
    
    return {"task_id": task_id, "logs": [log.dict() for log in logs]}

@app.get("/logs/{task_id}/stream")
async def stream_task_logs(task_id: str):
    """Получение логов задачи в режиме реального времени (SSE)"""
    if task_id not in task_logs:
        raise HTTPException(status_code=404, detail="Task not found")
    
    async def generate():
        last_log_index = 0
        while True:
            if task_id in task_logs and len(task_logs[task_id]) > last_log_index:
                new_logs = task_logs[task_id][last_log_index:]
                for log_entry in new_logs:
                    yield f"data: {log_entry.json()}\n\n"
                last_log_index = len(task_logs[task_id])
            
            # Проверяем, завершена ли задача
            if task_id in tasks_storage and tasks_storage[task_id].status in ["completed", "failed"]:
                break
                
            await asyncio.sleep(1)
    
    return StreamingResponse(generate(), media_type="text/event-stream")

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
        update_task_status(task_id, "IMPORTING_MANGA", 5, "Применены патчи")
        
        command = ["python", "main.py", "parse", slug, "--use", parser]
        result = await run_melon_command(command, task_id, timeout=1800)
        
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
                        "title": manga_data.get("localized_name") or manga_data.get("eng_name") or manga_data.get("title", ""),
                        "chapters": sum(len(chapters) for chapters in manga_data.get("content", {}).values()),
                        "branches": len(manga_data.get("content", {}))
                    }
                )
                
                # Автоматически запускаем build после успешного парсинга
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
        update_task_status(task_id, "IMPORTING_MANGA", 10, "Начинаем построение архива...")
        
        # Применяем патч перед каждым выполнением build команды
        ensure_cross_device_patch()
        
        # Команда билда
        command = ["python", "main.py", "build-manga", slug, "--use", parser]
        
        if build_type == "simple":
            command.append("-simple")
        elif build_type == "zip":
            command.append("-zip")
        elif build_type == "cbz":
            command.append("-cbz")
        
        result = await run_melon_command(command, task_id, timeout=1800)
        
        if result["success"]:
            update_task_status(
                task_id,
                "COMPLETED",
                100,
                f"Архив успешно построен ({build_type})",
                {
                    "filename": slug,
                    "archive_type": build_type
                }
            )
        else:
            error_msg = f"Ошибка построения: {result.get('stderr', 'Unknown error')}"
            logger.error(f"Build command failed for {slug}: stdout={result.get('stdout', '')}, stderr={result.get('stderr', '')}, return_code={result.get('return_code', 'unknown')}")
            
            update_task_status(
                task_id,
                "FAILED",
                100,
                error_msg
            )

    except Exception as e:
        logger.error(f"Critical error in build task {task_id}: {str(e)}")
        update_task_status(task_id, "FAILED", 100, f"Критическая ошибка: {str(e)}")

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
                                # Пытаемся извлечь название из разных полей
                                title = (manga_data.get("title") or 
                                        manga_data.get("localized_name") or 
                                        manga_data.get("eng_name") or 
                                        manga_data.get("slug", "Unknown"))
                                
                                parsed_manga.append({
                                    "slug": json_file.stem,
                                    "title": title,
                                    "parser": parser_dir.name,
                                    "chapters": sum(len(chapters) for chapters in manga_data.get("content", {}).values()),
                                    "branches": len(manga_data.get("content", {}))
                                })
                        except Exception as e:
                            logger.warning(f"Error reading {json_file}: {str(e)}")
        
        return {"manga_list": parsed_manga}
    
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

@app.get("/manga-info/{filename}")
async def get_manga_info(filename: str):
    """Получение информации о манге"""
    try:
        output_path = get_melon_base_path() / "Output"
        
        for parser_dir in output_path.iterdir():
            if parser_dir.is_dir():
                json_file = parser_dir / "titles" / f"{filename}.json"
                if json_file.exists():
                    with open(json_file, 'r', encoding='utf-8') as f:
                        return json.load(f)
        
        raise HTTPException(status_code=404, detail=f"Манга '{filename}' не найдена")
    
    except Exception as e:
        logger.error(f"Error getting manga info for {filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/images/{filename}/{chapter}/{page}")
async def get_image(filename: str, chapter: str, page: str):
    """Получение изображения страницы"""
    try:
        output_path = get_melon_base_path() / "Output"
        
        for parser_dir in output_path.iterdir():
            if parser_dir.is_dir():
                manga_dir = parser_dir / "archives" / filename
                if manga_dir.exists():
                    # Ищем папку главы, которая начинается с номера главы
                    chapter_dir = None
                    for potential_dir in manga_dir.iterdir():
                        if potential_dir.is_dir():
                            # Проверяем точное совпадение сначала
                            if potential_dir.name == chapter:
                                chapter_dir = potential_dir
                                break
                            # Потом проверяем начинается ли с номера главы
                            elif potential_dir.name.startswith(f"{chapter}.") or potential_dir.name.startswith(f"{chapter} "):
                                chapter_dir = potential_dir
                                break
                    
                    if chapter_dir:
                        # Проверяем изображения в найденной папке главы
                        for ext in ['.png', '.jpg', '.jpeg', '.webp']:
                            image_path = chapter_dir / f"{page}{ext}"
                            if image_path.exists():
                                return FileResponse(
                                    path=str(image_path),
                                    media_type=f"image/{ext[1:]}",
                                    headers={
                                        "Cache-Control": "public, max-age=3600",
                                        "Access-Control-Allow-Origin": "*"
                                    }
                                )
                
                # Если не найдено в archives, проверяем в images
                manga_dir = parser_dir / "images" / filename
                if manga_dir.exists():
                    # Ищем папку главы, которая начинается с номера главы
                    chapter_dir = None
                    for potential_dir in manga_dir.iterdir():
                        if potential_dir.is_dir():
                            # Проверяем точное совпадение сначала
                            if potential_dir.name == chapter:
                                chapter_dir = potential_dir
                                break
                            # Потом проверяем начинается ли с номера главы
                            elif potential_dir.name.startswith(f"{chapter}.") or potential_dir.name.startswith(f"{chapter} "):
                                chapter_dir = potential_dir
                                break
                    
                    if chapter_dir:
                        # Проверяем изображения в найденной папке главы
                        for ext in ['.png', '.jpg', '.jpeg', '.webp']:
                            image_path = chapter_dir / f"{page}{ext}"
                            if image_path.exists():
                                return FileResponse(
                                    path=str(image_path),
                                    media_type=f"image/{ext[1:]}",
                                    headers={
                                        "Cache-Control": "public, max-age=3600",
                                        "Access-Control-Allow-Origin": "*"
                                    }
                                )
        
        raise HTTPException(status_code=404, detail=f"Изображение не найдено: {filename}/{chapter}/{page}")
    
    except Exception as e:
        logger.error(f"Error serving image {filename}/{chapter}/{page}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/cover/{filename}")
async def get_cover(filename: str):
    """Получение обложки манги"""
    try:
        output_path = get_melon_base_path() / "Output"
        
        for parser_dir in output_path.iterdir():
            if parser_dir.is_dir():
                # Проверяем разные возможные пути к обложке
                possible_paths = [
                    # Стандартные пути (для старого формата)
                    parser_dir / "archives" / filename / "cover.jpg",
                    parser_dir / "archives" / filename / "cover.png",
                    parser_dir / "archives" / filename / "cover.webp",
                    parser_dir / "images" / filename / "cover.jpg",
                    parser_dir / "images" / filename / "cover.png",
                    parser_dir / "images" / filename / "cover.webp",
                ]
                
                # Проверяем стандартные пути
                for cover_path in possible_paths:
                    if cover_path.exists():
                        return FileResponse(
                            path=str(cover_path),
                            media_type=f"image/{cover_path.suffix[1:]}",
                            headers={
                                "Cache-Control": "public, max-age=86400",  # Кэш на сутки
                                "Access-Control-Allow-Origin": "*"
                            }
                        )
                
                # Проверяем папку covers с UUID файлами
                covers_dir = parser_dir / "images" / filename / "covers"
                if covers_dir.exists():
                    # Ищем первый файл изображения в папке covers
                    for cover_file in covers_dir.glob("*"):
                        if cover_file.is_file() and cover_file.suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp']:
                            return FileResponse(
                                path=str(cover_file),
                                media_type=f"image/{cover_file.suffix[1:]}",
                                headers={
                                    "Cache-Control": "public, max-age=86400",  # Кэш на сутки
                                    "Access-Control-Allow-Origin": "*"
                                }
                            )
        
        raise HTTPException(status_code=404, detail=f"Обложка не найдена для манги: {filename}")
    
    except Exception as e:
        logger.error(f"Error serving cover for {filename}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8084)