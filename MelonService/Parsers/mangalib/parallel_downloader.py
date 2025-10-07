"""
Параллельный загрузчик изображений с адаптивным управлением потоками.
Автоматически подстраивается под количество доступных прокси.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
from time import sleep, time
from typing import List, Dict, Callable, Optional, Any
import logging

logger = logging.getLogger(__name__)


class AdaptiveParallelDownloader:
    """
    Адаптивный параллельный загрузчик изображений.
    
    Особенности:
    - Автоматически определяет оптимальное количество потоков на основе прокси
    - Thread-safe операции
    - Обработка ошибок с retry
    - Адаптивный throttling при rate limiting (429)
    - Детальный прогресс
    """
    
    def __init__(
        self, 
        proxy_count: int,
        download_func: Callable[[str], Optional[str]],
        max_workers_per_proxy: int = 2,
        max_retries: int = 3,
        base_delay: float = 0.2,
        retry_delay: float = 1.0
    ):
        """
        Инициализация загрузчика.
        
        :param proxy_count: Количество доступных прокси
        :param download_func: Функция загрузки изображения (принимает URL, возвращает filename или None)
        :param max_workers_per_proxy: Максимум потоков на один прокси (по умолчанию 2)
        :param max_retries: Количество повторных попыток при ошибке
        :param base_delay: Базовая задержка между запросами (сек)
        :param retry_delay: Задержка перед повтором при ошибке (сек)
        """
        # Рассчитываем оптимальное количество воркеров
        # Формула: min(proxy_count * workers_per_proxy, 10) - не больше 10 потоков
        self.max_workers = min(proxy_count * max_workers_per_proxy, 10)
        
        # Если прокси мало, ограничиваем ещё сильнее
        if proxy_count <= 3:
            self.max_workers = min(self.max_workers, 3)
        elif proxy_count <= 5:
            self.max_workers = min(self.max_workers, 5)
        
        self.download_func = download_func
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.retry_delay = retry_delay
        
        # Thread-safe счётчики
        self._lock = Lock()
        self._downloaded = 0
        self._failed = 0
        self._total = 0
        
        # Адаптивный throttling
        self._rate_limit_detected = False
        self._current_delay = base_delay
        self._last_429_time = 0
        
        logger.info(
            f"🚀 ParallelDownloader initialized: {self.max_workers} workers "
            f"for {proxy_count} proxies (ratio: {max_workers_per_proxy}:1)"
        )
    
    def _adaptive_delay(self):
        """Адаптивная задержка с учётом rate limiting."""
        current_time = time()
        
        # Если недавно был 429 (в течение последних 30 секунд)
        if self._rate_limit_detected and (current_time - self._last_429_time) < 30:
            # Увеличиваем задержку в 3 раза
            delay = self._current_delay * 3
            logger.warning(f"⚠️ Rate limit active, increased delay to {delay}s")
        else:
            # Возвращаемся к базовой задержке
            delay = self.base_delay
            if self._rate_limit_detected:
                self._rate_limit_detected = False
                logger.info(f"✅ Rate limit cooldown ended, delay back to {delay}s")
        
        sleep(delay)
    
    def _handle_rate_limit(self):
        """Обработка rate limiting (429 ошибка)."""
        with self._lock:
            self._rate_limit_detected = True
            self._last_429_time = time()
            self._current_delay = self.base_delay * 3
        
        logger.warning(
            f"🚨 Rate limit detected! Slowing down (delay: {self._current_delay}s)"
        )
    
    def _download_single_image(self, url: str, index: int) -> Dict[str, Any]:
        """
        Загрузка одного изображения с retry логикой.
        
        :param url: URL изображения
        :param index: Индекс изображения (для логирования)
        :return: Словарь с результатом {success: bool, filename: str|None, url: str, attempts: int}
        """
        attempts = 0
        last_error = None
        
        for attempt in range(1, self.max_retries + 1):
            attempts = attempt
            
            try:
                # Адаптивная задержка перед запросом
                if attempt > 1:
                    # Exponential backoff для retry
                    backoff_delay = self.retry_delay * (2 ** (attempt - 2))
                    sleep(backoff_delay)
                else:
                    self._adaptive_delay()
                
                # Загрузка
                result = self.download_func(url)
                
                if result:
                    with self._lock:
                        self._downloaded += 1
                        current = self._downloaded
                        total = self._total
                    
                    # Показываем прогресс: каждые 10 изображений ИЛИ каждые 25% для маленьких батчей
                    progress_step = max(1, min(10, total // 4))  # Минимум каждое изображение, максимум каждые 10
                    if current % progress_step == 0 or current == total:
                        logger.info(
                            f"📥 Downloaded {current}/{total} images "
                            f"({current/total*100:.1f}%)"
                        )
                    
                    return {
                        'success': True,
                        'filename': result,
                        'url': url,
                        'attempts': attempts,
                        'index': index
                    }
                else:
                    # Загрузка вернула None - возможно 404 или другая ошибка
                    last_error = "Download returned None"
                    
            except Exception as e:
                last_error = str(e)
                
                # Проверяем на rate limiting
                if '429' in str(e) or 'too many requests' in str(e).lower():
                    self._handle_rate_limit()
                
                logger.warning(
                    f"⚠️ Attempt {attempt}/{self.max_retries} failed for image {index}: {e}"
                )
        
        # Все попытки провалились
        with self._lock:
            self._failed += 1
        
        logger.error(
            f"❌ Failed to download image {index} after {attempts} attempts: {last_error}"
        )
        
        return {
            'success': False,
            'filename': None,
            'url': url,
            'attempts': attempts,
            'error': last_error,
            'index': index
        }
    
    def download_batch(self, urls: List[str], progress_callback: Optional[Callable[[int, int], None]] = None) -> List[Dict[str, Any]]:
        """
        Параллельная загрузка батча изображений.
        
        :param urls: Список URL изображений
        :param progress_callback: Опциональный callback для прогресса (downloaded, total)
        :return: Список результатов [{success, filename, url, attempts, index}, ...]
        """
        if not urls:
            return []
        
        with self._lock:
            self._total = len(urls)
            self._downloaded = 0
            self._failed = 0
        
        logger.info(
            f"🚀 Starting parallel download: {len(urls)} images, "
            f"{self.max_workers} workers, delay: {self.base_delay}s"
        )
        
        results = []
        start_time = time()
        
        # Создаём ThreadPoolExecutor с рассчитанным количеством workers
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Отправляем все задачи
            future_to_url = {
                executor.submit(self._download_single_image, url, idx): (url, idx)
                for idx, url in enumerate(urls, start=1)
            }
            
            # Собираем результаты по мере выполнения
            for future in as_completed(future_to_url):
                url, idx = future_to_url[future]
                
                try:
                    result = future.result()
                    results.append(result)
                    
                    # Вызываем progress callback
                    if progress_callback:
                        with self._lock:
                            progress_callback(self._downloaded, self._total)
                    
                except Exception as e:
                    logger.error(f"❌ Unexpected error processing image {idx}: {e}")
                    results.append({
                        'success': False,
                        'filename': None,
                        'url': url,
                        'attempts': 0,
                        'error': str(e),
                        'index': idx
                    })
                    with self._lock:
                        self._failed += 1
        
        # Статистика
        elapsed = time() - start_time
        with self._lock:
            downloaded = self._downloaded
            failed = self._failed
            total = self._total
        
        avg_speed = total / elapsed if elapsed > 0 else 0
        
        logger.info(
            f"✅ Batch download completed: {downloaded}/{total} successful, "
            f"{failed} failed, {elapsed:.1f}s elapsed ({avg_speed:.2f} img/sec)"
        )
        
        # Сортируем результаты по исходному порядку
        results.sort(key=lambda x: x['index'])
        
        return results
