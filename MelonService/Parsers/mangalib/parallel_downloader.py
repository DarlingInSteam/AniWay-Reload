"""
Параллельный загрузчик изображений с адаптивным управлением потоками.
Автоматически подстраивается под количество доступных прокси.
"""

from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock, Semaphore
from time import sleep, time
from typing import List, Dict, Callable, Optional, Any
import logging
try:
    import requests
except Exception:
    requests = None

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
        download_func: Callable[..., Optional[str]],
        max_workers_per_proxy: int = 1,
        max_retries: int = 3,
        base_delay: float = 0.1,
        retry_delay: float = 1.0,
        max_total_workers: Optional[int] = None,
        proxy_pool: Optional[list] = None,
    ):
        """
        Инициализация загрузчика.

        :param proxy_count: Количество доступных прокси
        :param download_func: Функция загрузки изображения (принимает URL, возвращает filename или None)
        :param max_workers_per_proxy: Максимум потоков на один прокси (по умолчанию 2)
        :param max_retries: Количество повторных попыток при ошибке
        :param base_delay: Базовая задержка между запросами (сек)
        :param retry_delay: Задержка перед повтором при ошибке (сек)
        :param max_total_workers: Жесткий предел на количество потоков (переопределяет авторасчет)
        """
        # Считаем разумное количество worker-ов: proxy_count * workers_per_proxy
        computed_workers = max(1, proxy_count * max_workers_per_proxy)

        # Allow using more workers when proxy_count is large; keep a safe minimum cap of 16
        # Use max_workers_per_proxy to compute a reasonable cap (e.g., 2 workers per proxy)
        cap = max(16, proxy_count * max_workers_per_proxy)
        computed_workers = min(computed_workers, cap)

        if proxy_count == 1:
            computed_workers = min(computed_workers, max(2, max_workers_per_proxy + 1))
        elif proxy_count == 2:
            computed_workers = min(computed_workers, 4)
        elif proxy_count == 3:
            computed_workers = min(computed_workers, 6)
        elif proxy_count <= 5:
            computed_workers = min(computed_workers, 8)

        if max_total_workers is not None:
            try:
                override_value = int(max_total_workers)
                if override_value > 0:
                    computed_workers = max(1, min(override_value, 32))
            except (TypeError, ValueError):
                logger.warning(f"⚠️ Invalid max_total_workers override: {max_total_workers}")

        self.max_workers = computed_workers

        self.download_func = download_func
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.retry_delay = retry_delay
        # Optional deterministic proxy pool (list of {'http':..., 'https':...})
        self.proxy_pool = proxy_pool or []

        # Per-proxy concurrency control and session reuse to improve connection pooling
        self._proxy_semaphores: Dict[int, Semaphore] = {}
        self._proxy_sessions: Dict[int, "requests.Session"] = {}
        if self.proxy_pool:
            for i, p in enumerate(self.proxy_pool):
                # limit concurrent connections per proxy to max_workers_per_proxy
                self._proxy_semaphores[i] = Semaphore(max_workers_per_proxy)
                # create a session per proxy to reuse TCP connections (only if requests is available)
                if requests is not None:
                    try:
                        s = requests.Session()
                        # set the proxy on the session so underlying poolmanager will use it
                        if isinstance(p, dict):
                            s.proxies.update(p)
                        # increase pool connections a bit
                        try:
                            adapter = requests.adapters.HTTPAdapter(pool_connections=max_workers_per_proxy + 2,
                                                                    pool_maxsize=max_workers_per_proxy + 10)
                            s.mount('http://', adapter)
                            s.mount('https://', adapter)
                        except Exception:
                            pass
                        self._proxy_sessions[i] = s
                    except Exception:
                        # fall back to no session for this proxy
                        self._proxy_sessions[i] = None
                else:
                    self._proxy_sessions[i] = None

        # Thread-safe счётчики
        self._lock = Lock()
        self._downloaded = 0
        self._failed = 0
        self._total = 0

        # Адаптивный throttling
        self._rate_limit_detected = False
        self._current_delay = base_delay
        self._last_429_time = 0

        # Единоразовый лог инициализации воркеров (всегда показываем)
        override_note = f", override={max_total_workers}" if max_total_workers else ""
        pool_note = f", proxy_pool={len(self.proxy_pool)}" if self.proxy_pool else ""
        logger.info(
            f"⚙️ Workers: {self.max_workers} active, {proxy_count} proxies, {base_delay}s delay{override_note}{pool_note}"
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

                # Deterministic proxy assignment: use pool by round-robin if provided
                assigned_proxies = None
                try:
                    if self.proxy_pool:
                        assigned_proxies = self.proxy_pool[(index - 1) % len(self.proxy_pool)]
                except Exception:
                    assigned_proxies = None

                # Загрузка (download_func may accept proxies kw or session kw)
                proxy_index = None
                if self.proxy_pool:
                    try:
                        proxy_index = (index - 1) % len(self.proxy_pool)
                    except Exception:
                        proxy_index = None

                acquired = False
                if proxy_index is not None:
                    sem = self._proxy_semaphores.get(proxy_index)
                    if sem:
                        # shorter timeout to avoid long stalls
                        acquired = sem.acquire(timeout=5)

                try:
                    # Prefer calling download_func with proxies kw; fallback to positional call
                    try:
                        result = self.download_func(url, proxies=assigned_proxies)
                    except TypeError:
                        result = self.download_func(url)
                finally:
                    if acquired and proxy_index is not None:
                        sem = self._proxy_semaphores.get(proxy_index)
                        if sem:
                            try:
                                sem.release()
                            except Exception:
                                pass

                if result:
                    with self._lock:
                        self._downloaded += 1
                        current = self._downloaded
                        total = self._total

                    # Убираем подробные debug логи - важные метрики теперь в MangaBuilder

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

        # Убираем debug лог - важная информация теперь в MangaBuilder

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

        # Убираем подробный лог - важные метрики теперь в MangaBuilder

        # Сортируем результаты по исходному порядку
        results.sort(key=lambda x: x['index'])

        return results
