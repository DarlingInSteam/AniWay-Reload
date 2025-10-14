from Source.Core.Base.Formats.Manga import Branch, Chapter, Types
from Source.Core.Base.Parsers.MangaParser import MangaParser
from Source.Core.Base.Formats.BaseFormat import Statuses

from dublib.Methods.Data import RemoveRecurringSubstrings, Zerotify
from dublib.WebRequestor import WebRequestor

from datetime import datetime
from time import sleep
from typing import Optional

# Параллельный загрузчик изображений
from .parallel_downloader import AdaptiveParallelDownloader

class Parser(MangaParser):
    def amend(self, branch: Branch, chapter: Chapter):
        """
        Дополняет главу дайными о слайдах.
            branch – данные ветви;
            chapter – данные главы.
        """

        # Подсчитываем общее количество глав и текущий индекс
        total_chapters = sum(len(b.chapters) for b in self._Title.branches)
        current_chapter_index = 0
        
        # Находим индекс текущей главы
        for b in self._Title.branches:
            for ch in b.chapters:
                current_chapter_index += 1
                if ch.id == chapter.id:
                    break
            else:
                continue
            break
        
        # Логируем начало парсинга главы через Portals
        self._Portals.chapter_parsing_start(self._Title, chapter, current_chapter_index, total_chapters)

        import time
        start_time = time.time()
        Slides = self.__GetSlides(branch.id, chapter)
        parse_time = time.time() - start_time
        
        # СИНИЙ ЛОГ: Прогресс парсинга с метриками
        chapter_name = f"Vol.{chapter.volume} " if chapter.volume else ""
        chapter_name += f"Ch.{chapter.number}"
        if chapter.name:
            chapter_name += f": {chapter.name}"
        
        slides_count = len(Slides)
        self._SystemObjects.logger.info(f"\033[94m🔍 [{current_chapter_index}/{total_chapters}] {chapter_name} - {slides_count} pages ({parse_time:.2f}s)\033[0m")

        for Slide in Slides:
            chapter.add_slide(Slide["link"], Slide["width"], Slide["height"])

        # НОВОЕ: Выводим завершение парсинга главы
        slides_count = len(Slides)
        print(f"[{current_chapter_index}/{total_chapters}] Chapter {chapter_name} completed ({slides_count} slides)")
        
        # Логируем завершение парсинга главы через Portals
        self._Portals.chapter_parsing_complete(self._Title, chapter, current_chapter_index, total_chapters, slides_count)

    def _InitializeRequestor(self) -> WebRequestor:
        """Инициализирует модуль WEB-запросов."""

        WebRequestorObject = super()._InitializeRequestor()

        # Добавляем авторизационный токен если есть
        if self._Settings.custom["token"]:
            WebRequestorObject.config.add_header("Authorization", self._Settings.custom["token"])

        # PROXY ROTATION SUPPORT:
        # Приоритет конфигурации прокси:
        # 1. ProxyRotator из settings.json (если включен и есть прокси)
        # 2. Переменные окружения HTTP_PROXY/HTTPS_PROXY
        # 3. Без прокси

        import sys
        import os
        from pathlib import Path

        # Добавляем путь к MelonService в sys.path для импорта proxy_rotator
        melon_service_path = Path(__file__).parent.parent.parent
        if str(melon_service_path) not in sys.path:
            sys.path.insert(0, str(melon_service_path))

        try:
            from proxy_rotator import ProxyRotator

            # Создаём экземпляр ротатора для парсера
            rotator = ProxyRotator(parser="mangalib")

            if rotator.enabled and rotator.get_proxy_count() > 0:
                # Получаем прокси (с ротацией если их несколько)
                if rotator.get_proxy_count() == 1:
                    proxy_dict = rotator.get_current_proxy()
                    print(f"[INFO] 🔒 Single proxy mode (no rotation): {rotator.get_proxy_count()} proxy")
                else:
                    proxy_dict = rotator.get_next_proxy()
                    print(f"[INFO] 🔄 Proxy rotation enabled: {rotator.get_proxy_count()} proxies, strategy={rotator.rotation_strategy}")

                if proxy_dict:
                    try:
                        if hasattr(WebRequestorObject, '_WebRequestor__Session'):
                            WebRequestorObject._WebRequestor__Session.proxies.update(proxy_dict)
                            print(f"[INFO] ✅ Proxy configured via ProxyRotator")
                        elif hasattr(WebRequestorObject, 'session'):
                            WebRequestorObject.session.proxies.update(proxy_dict)
                            print(f"[INFO] ✅ Proxy configured via ProxyRotator (public session)")
                    except Exception as e:
                        print(f"[WARNING] ⚠️  Failed to set proxy from ProxyRotator: {e}")
            else:
                print(f"[INFO] ℹ️  ProxyRotator disabled, checking environment variables...")

                # Fallback: переменные окружения
                http_proxy = os.getenv("HTTP_PROXY") or os.getenv("http_proxy")
                https_proxy = os.getenv("HTTPS_PROXY") or os.getenv("https_proxy")

                if http_proxy or https_proxy:
                    proxies = {}
                    if http_proxy:
                        proxies['http'] = http_proxy
                    if https_proxy:
                        proxies['https'] = https_proxy

                    try:
                        if hasattr(WebRequestorObject, '_WebRequestor__Session'):
                            WebRequestorObject._WebRequestor__Session.proxies.update(proxies)
                            print(f"[INFO] ✅ Proxy configured from env vars: {http_proxy or https_proxy}")
                        elif hasattr(WebRequestorObject, 'session'):
                            WebRequestorObject.session.proxies.update(proxies)
                            print(f"[INFO] ✅ Proxy configured from env vars (public session)")
                    except Exception as e:
                        print(f"[WARNING] ⚠️  Failed to configure proxy from env: {e}")
                else:
                    print(f"[INFO] ℹ️  No proxy configured (direct connection)")

        except ImportError as e:
            print(f"[WARNING] ⚠️  ProxyRotator not available: {e}")
            print(f"[INFO] ℹ️  Falling back to environment variables...")

            # Fallback на переменные окружения
            http_proxy = os.getenv("HTTP_PROXY") or os.getenv("http_proxy")
            https_proxy = os.getenv("HTTPS_PROXY") or os.getenv("https_proxy")

            if http_proxy or https_proxy:
                proxies = {}
                if http_proxy:
                    proxies['http'] = http_proxy
                if https_proxy:
                    proxies['https'] = https_proxy

                try:
                    if hasattr(WebRequestorObject, '_WebRequestor__Session'):
                        WebRequestorObject._WebRequestor__Session.proxies.update(proxies)
                        print(f"[INFO] ✅ Proxy configured from env vars: {http_proxy or https_proxy}")
                    elif hasattr(WebRequestorObject, 'session'):
                        WebRequestorObject.session.proxies.update(proxies)
                        print(f"[INFO] ✅ Proxy configured from env vars (public)")
                except Exception as e:
                    print(f"[WARNING] ⚠️  Failed to configure proxy: {e}")

        return WebRequestorObject

    def _download_image_wrapper(self, url: str) -> str | None:
        """Thread-safe обертка с независимой сессией requests для каждого потока.

        :param url: URL изображения
        :return: Имя файла если успешно, None если ошибка
        """
        import os
        from pathlib import Path
        import hashlib
        import requests
        from urllib.parse import urlparse, unquote

        directory = self._SystemObjects.temper.parser_temp
        os.makedirs(directory, exist_ok=True)

        # Определяем имя файла из URL с учётом декодирования
        parsed_url = urlparse(url)
        decoded_path = unquote(parsed_url.path or "")
        trimmed_path = decoded_path.rstrip("/")
        path_obj = Path(trimmed_path) if trimmed_path else Path("")

        resolved_suffix = path_obj.suffix if trimmed_path else ""
        resolved_name = path_obj.stem if trimmed_path else ""

        if not resolved_name or resolved_name in {".", ".."}:
            candidate_name = path_obj.name if trimmed_path else ""
            if candidate_name not in {"", ".", ".."}:
                resolved_name = Path(candidate_name).stem
            else:
                resolved_name = ""

        if not resolved_suffix and trimmed_path:
            resolved_suffix = Path(path_obj.name).suffix

        if not resolved_name:
            resolved_name = hashlib.sha1(url.encode("utf-8")).hexdigest()

        image_filename = f"{resolved_name}{resolved_suffix}"
        image_path = os.path.join(directory, image_filename)

        # Если файл уже существует и не FORCE_MODE, возвращаем имя
        if os.path.exists(image_path) and not self._SystemObjects.FORCE_MODE:
            return image_filename

        try:
            # Получаем основной WebRequestor
            requestor = self._ImagesDownloader._ImagesDownloader__Requestor

            # Создаем НЕЗАВИСИМУЮ сессию requests для этого потока
            session = requests.Session()

            # Копируем cookies из WebRequestor Session (thread-safe read)
            source_session = None
            if hasattr(requestor, '_WebRequestor__Session'):
                source_session = requestor._WebRequestor__Session
            elif hasattr(requestor, 'session'):
                source_session = requestor.session
            elif hasattr(requestor, '_session'):
                source_session = requestor._session

            if source_session and hasattr(source_session, 'cookies'):
                try:
                    # КРИТИЧНО: НЕ используем update() напрямую - это вызывает deadlock!
                    cookies_dict = dict(source_session.cookies)
                    for name, value in cookies_dict.items():
                        session.cookies.set(name, value)
                except Exception:
                    pass

            # Копируем headers из source session
            if source_session and hasattr(source_session, 'headers'):
                try:
                    headers_dict = dict(source_session.headers)
                    session.headers.update(headers_dict)
                except Exception:
                    pass

            # Добавляем стандартные headers для изображений
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
                'Referer': 'https://mangalib.me/',
            })

            # Получаем прокси (опционально)
            proxies = None
            if hasattr(self, '_ProxyRotator') and self._ProxyRotator:
                proxy = self._ProxyRotator.get_next_proxy()
                if proxy and isinstance(proxy, dict):
                    proxies = proxy

            # ПАРАЛЛЕЛЬНЫЙ HTTP запрос через независимую сессию!
            # stream=True для защиты от IncompleteRead на больших файлах
            response = session.get(url, timeout=30, proxies=proxies, stream=True)

            if response.status_code == 200:
                # Читаем контент по частям, защита от IncompleteRead
                content = b""
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        content += chunk

                if len(content) > 1000:
                    with open(image_path, "wb") as f:
                        f.write(content)
                    return image_filename

        except Exception as e:
            # Тихо пропускаем ошибки, retry механизм обработает
            pass
        finally:
            # Закрываем сессию
            if 'session' in locals():
                session.close()

        return None

    def _get_scaled_delay(
        self,
        base_value: float,
        *,
        baseline_proxies: int = 5,
        minimum: float = 0.02,
        maximum: Optional[float] = None
    ) -> float:
        """Адаптирует задержку под количество доступных прокси."""

        proxies = getattr(self, "_proxy_count_cache", None)
        if not isinstance(proxies, int) or proxies <= 0:
            proxies = self._get_proxy_count()

        proxies = max(1, proxies)
        baseline = max(1, baseline_proxies)
        scale = baseline / proxies
        scaled = base_value * scale

        if maximum is not None:
            scaled = min(scaled, maximum)

        if scaled < minimum:
            return minimum

        return scaled

    def _get_common_delay(self) -> float:
        cached = getattr(self, "_common_delay", None)
        if cached is None:
            self._common_delay = self._get_scaled_delay(
                getattr(self._Settings.common, "delay", 0.25),
                minimum=0.05
            )
            return self._common_delay
        return cached

    def _get_parse_delay(self) -> float:
        cached = getattr(self, "_parse_delay", None)
        if cached is None:
            self._parse_delay = self._get_scaled_delay(
                getattr(self._Settings.common, "parse_delay", 0.15),
                minimum=0.04
            )
            return self._parse_delay
        return cached

    def _get_image_delay(self) -> float:
        cached = getattr(self, "_image_delay", None)
        if cached is None:
            self._image_delay = self._get_scaled_delay(
                getattr(self._Settings.common, "image_delay", 0.1),
                minimum=0.03
            )
            return self._image_delay
        return cached

    def _PostInitMethod(self):
        """Метод, выполняющийся после инициализации объекта."""
        
        print(f"[CRITICAL_DEBUG] _PostInitMethod() CALLED!", flush=True)

        self.__TitleSlug = None
        self.__API = "api.cdnlibs.org"
        self.__Sites = {
            "mangalib.me": 1,
            "slashlib.me": 2,
            "hentailib.me": 4
        }
        
        print(f"[CRITICAL_DEBUG] About to initialize AdaptiveParallelDownloader...", flush=True)
        
        # Инициализируем ProxyRotator если доступен
        self._ProxyRotator = None
        try:
            import sys
            from pathlib import Path
            
            melon_service_path = Path(__file__).parent.parent.parent
            if str(melon_service_path) not in sys.path:
                sys.path.insert(0, str(melon_service_path))
            
            from proxy_rotator import ProxyRotator
            rotator = ProxyRotator(parser="mangalib")
            
            if rotator.enabled and rotator.get_proxy_count() > 0:
                self._ProxyRotator = rotator
                print(f"[INFO] ✅ ProxyRotator initialized: {rotator.get_proxy_count()} proxies", flush=True)
        except Exception as e:
            print(f"[WARNING] ProxyRotator not available: {e}", flush=True)
        
        # КРИТИЧЕСКИ ВАЖНО: Инициализация параллельного загрузчика в __init__, а не в parse()
        # Потому что build может вызываться без parse (когда JSON уже существует)
        proxy_count = self._get_proxy_count()
        self._common_delay = self._get_common_delay()
        self._parse_delay = self._get_parse_delay()
        self._image_delay = self._get_image_delay()
        image_delay = self._image_delay

        max_workers_override = getattr(self._Settings.common, 'image_max_workers', None)
        if max_workers_override is None:
            try:
                import os
                env_override = os.getenv("MELON_IMAGE_MAX_WORKERS")
                if env_override is not None:
                    max_workers_override = int(env_override)
            except ValueError:
                print(f"[WARNING] Invalid MELON_IMAGE_MAX_WORKERS value, skipping override", flush=True)

        print(
            f"[CRITICAL_DEBUG] proxy_count={proxy_count}, image_delay={image_delay}, override={max_workers_override}",
            flush=True
        )
        
        # НЕ НУЖЕН Lock — каждый поток создает свою сессию requests!
        self._parallel_downloader = AdaptiveParallelDownloader(
            proxy_count=proxy_count,
            download_func=self._download_image_wrapper,
            max_workers_per_proxy=2,
            max_retries=3,
            base_delay=image_delay,
            max_total_workers=max_workers_override
        )
        
        print(f"[CRITICAL_DEBUG] AdaptiveParallelDownloader CREATED successfully!", flush=True)
        
        # Кешируем сервер изображений для ускорения парсинга
        self._cached_image_server = None

    def __IsSlideLink(self, link: str, servers: list[str]) -> bool:
        """
        Проверяет, ведёт ли ссылка на слайд.
            link – ссылка на изображение;
            servers – список серверов изображений.
        """

        for Server in servers:
            if Server in link: return True

        return False
    
    def __ParseSlideLink(self, link: str, servers: list[str]) -> tuple[str]:
        """
        Парсит ссылку на слайд.
            link – ссылка на изображение;
            servers – список серверов изображений.
        """

        OriginalServer = None
        URI = None

        for Server in servers:

            if Server in link:
                OriginalServer = Server
                URI = link.replace(OriginalServer, "")

        return (OriginalServer, URI)

    #==========================================================================================#
    # >>>>> ПРИВАТНЫЕ МЕТОДЫ ПАРСИНГА <<<<< #
    #==========================================================================================#

    def __CheckCorrectDomain(self, data: dict) -> str:
        """
        Получает возрастной рейтинг.
            data – словарь данных тайтла.
        """

        Domain = self._Manifest.site

        if self._Title.site:

            if data["site"] != self.__GetSiteID(self._Title.site):
                Domain = self.__GetSiteDomain(data["site"])
                self._Portals.warning(f"Title site changed to \"{Domain}\".")

        return Domain 

    def __GetAgeLimit(self, data: dict) -> int:
        """
        Получает возрастной рейтинг.
            data – словарь данных тайтла.
        """

        Rating = None
        RatingString = data["ageRestriction"]["label"].split(" ")[0].replace("+", "").replace("Нет", "")
        if RatingString.isdigit(): Rating = int(RatingString)

        return Rating 

    def __GetAuthors(self, data: dict) -> list[str]:
        """Получает список авторов."""

        Authors = list()
        for Author in data["authors"]: Authors.append(Author["name"])

        return Authors

    def __GetBranches(self) -> list[Branch]:
        """Получает содержимое тайтла."""

        Branches: dict[int, Branch] = dict()
        Response = self._Requestor.get(f"https://{self.__API}/api/manga/{self.__TitleSlug}/chapters")
        
        if Response.status_code == 200:
            Data = Response.json["data"]
            sleep(self._get_common_delay())

            for CurrentChapterData in Data:

                for BranchData in CurrentChapterData["branches"]:
                    BranchID = BranchData["branch_id"]
                    if BranchID == None: BranchID = int(str(self._Title.id) + "0")
                    if BranchID not in Branches.keys(): Branches[BranchID] = Branch(BranchID)

                    ChapterObject = Chapter(self._SystemObjects)
                    ChapterObject.set_id(BranchData["id"])
                    ChapterObject.set_volume(CurrentChapterData["volume"])
                    ChapterObject.set_number(CurrentChapterData["number"])
                    ChapterObject.set_name(CurrentChapterData["name"])
                    ChapterObject.set_is_paid("restricted_view" in BranchData and not BranchData["restricted_view"]["is_open"])
                    ChapterObject.set_workers([sub["name"] for sub in BranchData["teams"]])
                    ChapterObject.add_extra_data("moderated", False if "moderation" in BranchData.keys() else True)

                    if self._Settings.custom["add_free_publication_date"] and ChapterObject.is_paid:
                        ChapterObject.add_extra_data("free-publication-date", BranchData["restricted_view"]["expired_at"])

                    Branches[BranchID].add_chapter(ChapterObject)

        else: self._Portals.request_error(Response, "Unable to request chapter.", exception = False)

        for CurrentBranch in Branches.values(): self._Title.add_branch(CurrentBranch)

    def __GetCovers(self, data: dict) -> list[str]:
        """Получает список обложек."""

        Covers = list()

        if data["cover"]:
            Covers.append({
                "link": data["cover"]["default"],
                "filename": data["cover"]["default"].split("/")[-1]
            })

        if self._Settings.common.sizing_images:
            Covers[0]["width"] = None
            Covers[0]["height"] = None

        return Covers

    def __GetDescription(self, data: dict) -> str | None:
        """
        Получает описание.
            data – словарь данных тайтла.
        """

        Description = None
        if "summary" in data.keys(): Description = RemoveRecurringSubstrings(data["summary"], "\n").strip().replace(" \n", "\n")
        Description = Zerotify(Description)

        return Description

    def __GetFranchises(self, data: dict) -> list[str]:
        """
        Получает список серий.
            data – словарь данных тайтла.
        """

        Franchises = list()
        for Franchise in data["franchise"]: Franchises.append(Franchise["name"])
        if "Оригинальные работы" in Franchises: Franchises.remove("Оригинальные работы")

        return Franchises

    def __GetGenres(self, data: dict) -> list[str]:
        """
        Получает список жанров.
            data – словарь данных тайтла.
        """

        Genres = list()
        for Genre in data["genres"]: Genres.append(Genre["name"])

        return Genres

    def __GetImagesServers(self, server_id: str | None = None, all_sites: bool = False) -> list[str]:
        """
        Возвращает один или несколько доменов серверов хранения изображений.
            server_id – идентификатор сервера;\n
            all_sites – указывает, что вернуть нужно домены хранилищ изображений для всех сайтов.
        """

        Servers = list()
        CurrentSiteID = self.__GetSiteID()
        URL = f"https://{self.__API}/api/constants?fields[]=imageServers"
        Headers = {
            "Authorization": self._Settings.custom["token"],
            "Referer": f"https://{self._Manifest.site}/"
        }
        Response = self._Requestor.get(URL, headers = Headers)

        if Response.status_code == 200:
            Data = Response.json["data"]["imageServers"]
            sleep(self._get_common_delay())

            for ServerData in Data:

                if server_id:
                    if ServerData["id"] == server_id and CurrentSiteID in ServerData["site_ids"]: Servers.append(ServerData["url"])
                    elif ServerData["id"] == server_id and all_sites: Servers.append(ServerData["url"])

                else:
                    if CurrentSiteID in ServerData["site_ids"] or all_sites: Servers.append(ServerData["url"])

        else:
            self._Portals.request_error(Response, "Unable to request site constants.")

        return Servers

    def __GetSiteDomain(self, id: str) -> int | None:
        """
        Возвращает домен сайта.
            id – целочисленный идентификатор сайта.
        """

        SiteDomain = None

        for Domain, ID in self.__Sites.items():
            if ID == id: SiteDomain = Domain
        
        return SiteDomain

    def __GetSiteID(self, site: str = None) -> int | None:
        """
        Возвращает целочисленный идентификатор сайта.
            site – домен сайта (по умолчанию используемый парсером).
        """

        if not site: site = self._Manifest.site
        SiteID = None

        for Domain in self.__Sites.keys():
            if Domain in site: SiteID = self.__Sites[Domain]
        
        return SiteID

    def __GetSlides(self, branch_id: int, chapter: Chapter) -> list[dict]:
        """
        Получает данные о слайдах главы.
            branch_id – идентификатор ветви;\n
            chapter – данные главы.
        """

        Slides = list()

        if "moderated" in chapter.to_dict().keys() and not chapter["moderated"]:
            self._Portals.chapter_skipped(self._Title, chapter, comment = "Not moderated.")
            return Slides
        
        # Используем кешированный сервер вместо повторных запросов
        if self._cached_image_server is None:
            self._cached_image_server = self.__GetImagesServers(self._Settings.custom["server"])[0]
        Server = self._cached_image_server

        parse_delay = self._get_parse_delay()

        token = None
        custom_settings = getattr(self._Settings, "custom", None)
        if custom_settings is not None:
            try:
                token = custom_settings["token"]
            except KeyError:
                token = None
        headers: dict[str, str] = {
            "Referer": f"https://{self._Manifest.site}/"
        }

        site_id = self.__GetSiteID()
        if site_id is not None:
            headers["Site-Id"] = str(site_id)

        if token:
            headers["Authorization"] = token

        default_branch_id = int(str(self._Title.id) + "0")
        branch_query_value = branch_id if branch_id and branch_id != default_branch_id else None

        base_endpoint = f"https://{self.__API}/api/manga/{self.__TitleSlug}/chapter"
        url_variants: list[str] = []

        query_params: list[str] = []
        if chapter.number:
            query_params.append(f"number={chapter.number}")
        if chapter.volume:
            query_params.append(f"volume={chapter.volume}")
        if branch_query_value:
            query_params.append(f"branch_id={branch_query_value}")

        if query_params:
            url_variants.append(f"{base_endpoint}?{'&'.join(query_params)}")

        if chapter.id:
            branch_suffix = f"?branch_id={branch_query_value}" if branch_query_value else ""
            url_variants.append(f"{base_endpoint}/{chapter.id}{branch_suffix}")

            id_query_params = [f"chapter_id={chapter.id}"]
            if branch_query_value:
                id_query_params.append(f"branch_id={branch_query_value}")
            url_variants.append(f"{base_endpoint}?{'&'.join(id_query_params)}")

            generic_id_query = [f"id={chapter.id}"]
            if branch_query_value:
                generic_id_query.append(f"branch_id={branch_query_value}")
            url_variants.append(f"{base_endpoint}?{'&'.join(generic_id_query)}")

        # Добавляем вариант без фильтров на случай, если номер/том отсутствуют
        if not url_variants:
            fallback_params = []
            if branch_query_value:
                fallback_params.append(f"branch_id={branch_query_value}")
            if chapter.id:
                fallback_params.append(f"id={chapter.id}")
            if fallback_params:
                url_variants.append(f"{base_endpoint}?{'&'.join(fallback_params)}")

        # Удаляем дубликаты, сохраняя порядок
        url_variants = list(dict.fromkeys(url_variants))

        last_error: str | None = None
        last_status: int | None = None
        last_response = None

        retryable_statuses = {408, 409, 423, 425, 429, 500, 502, 503, 504}
        max_retry_attempts = getattr(self._Settings.common, "chapter_retry_attempts", 3)
        initial_retry_delay = getattr(self._Settings.common, "chapter_retry_delay", 2.0)
        retry_backoff_factor = getattr(self._Settings.common, "chapter_retry_backoff", 2.0)

        def extract_error_message(response) -> str | None:
            if response is None:
                return None
            try:
                payload = response.json
            except Exception:
                payload = None

            if isinstance(payload, dict):
                for key in ("message", "error", "detail", "reason"):
                    value = payload.get(key)
                    if isinstance(value, str) and value.strip():
                        return value.strip()

                errors_obj = payload.get("errors")
                if isinstance(errors_obj, dict):
                    first_error = next((str(v) for v in errors_obj.values() if v), None)
                    if first_error:
                        return first_error

            if hasattr(response, "text"):
                text_value = response.text
                if isinstance(text_value, str):
                    snippet = text_value.strip()
                    if snippet:
                        return snippet[:200]
            return None

        for url in url_variants:
            attempt = 0
            while True:
                Response = self._Requestor.get(url, headers=headers if headers else None)
                last_response = Response
                last_status = Response.status_code

                if Response.status_code == 200:
                    break

                error_message = extract_error_message(Response)
                last_error = f"HTTP {Response.status_code}"
                if error_message:
                    last_error = f"HTTP {Response.status_code}: {error_message}"

                if Response.status_code in retryable_statuses and attempt < max_retry_attempts:
                    wait_seconds = initial_retry_delay * (retry_backoff_factor ** attempt)
                    wait_seconds = max(wait_seconds, 1.5)
                    wait_seconds = min(wait_seconds, 30.0)
                    self._SystemObjects.logger.warning(
                        f"Chapter {chapter.id} request to {url} returned {Response.status_code}. "
                        f"Retrying in {wait_seconds:.1f}s (attempt {attempt + 1}/{max_retry_attempts}).")
                    sleep(wait_seconds)
                    attempt += 1
                    continue

                break

            if Response.status_code != 200:
                continue

            Payload = Response.json
            Data = Payload.get("data") if isinstance(Payload, dict) else None

            if not isinstance(Data, dict):
                last_error = "No data in response"
                continue

            Pages = Data.get("pages")
            if not Pages:
                last_error = "Empty pages list"
                continue

            sleep(parse_delay)

            for SlideIndex, Page in enumerate(Pages, start=1):
                RelativeURL = Page.get("url")
                if not RelativeURL:
                    continue

                Buffer = {
                    "index": SlideIndex,
                    "link": Server + RelativeURL.replace(" ", "%20"),
                    "width": Page.get("width"),
                    "height": Page.get("height")
                }
                Slides.append(Buffer)

            if Slides:
                self._Portals.chapter_download_start(self._Title, chapter, len(Pages), len(Pages))
                break

        if Slides:
            return Slides

        reason_parts: list[str] = []
        if chapter.is_paid:
            reason_parts.append("платная глава — доступ ограничен")
        if last_error:
            reason_parts.append(last_error)
        elif last_status:
            reason_parts.append(f"HTTP {last_status}")
        else:
            reason_parts.append("источник не вернул страницы")

        reason_comment = "; ".join(reason_parts)
        chapter.add_extra_data("empty_reason", reason_comment)
        self._SystemObjects.logger.warning(f"Chapter {chapter.id} returned no slides ({reason_comment}).")
        if last_response and last_response.status_code != 200:
            self._Portals.request_error(last_response, "Unable to request chapter content.", exception=False)
        self._Portals.chapter_skipped(self._Title, chapter, comment=reason_comment)

        return Slides

    def __GetStatus(self, data: dict) -> str:
        """
        Получает статус.
            data – словарь данных тайтла.
        """

        Status = None
        StatusesDetermination = {
            1: Statuses.ongoing,
            2: Statuses.completed,
            3: Statuses.announced,
            4: Statuses.dropped,
            5: Statuses.dropped
        }
        SiteStatusIndex = data["status"]["id"]
        if SiteStatusIndex in StatusesDetermination.keys(): Status = StatusesDetermination[SiteStatusIndex]

        return Status

    def __GetTitleData(self) -> dict | None:
        """
        Получает данные тайтла.
            slug – алиас.
        """
        
        URL = f"https://{self.__API}/api/manga/{self.__TitleSlug}?fields[]=eng_name&fields[]=otherNames&fields[]=summary&fields[]=releaseDate&fields[]=type_id&fields[]=caution&fields[]=genres&fields[]=tags&fields[]=franchise&fields[]=authors&fields[]=manga_status_id&fields[]=status_id"
        
        # DEBUG: Логируем запрос
        print(f"[DEBUG] 🔍 Requesting title data for: {self.__TitleSlug}")
        print(f"[DEBUG] 🌐 URL: {URL}")
        
        Response = self._Requestor.get(URL)
        
        # DEBUG: Логируем ответ
        print(f"[DEBUG] 📡 Response status: {Response.status_code}")
        if hasattr(Response, 'text'):
            response_preview = Response.text[:500] if hasattr(Response.text, '__getitem__') else str(Response.text)[:500]
            print(f"[DEBUG] 📄 Response preview: {response_preview}")

        if Response.status_code == 200:
            Response = Response.json["data"]
            sleep(self._get_common_delay())

        elif Response.status_code == 451: 
            self._Portals.request_error(Response, "Account banned.")
            return None
        elif Response.status_code == 404: 
            self._Portals.title_not_found(self._Title)
            return None
        else: 
            self._Portals.request_error(Response, "Unable to request title data.")
            return None

        return Response

    def __GetTags(self, data: dict) -> list[str]:
        """
        Получает список тегов.
            data – словарь данных тайтла.
        """

        Tags = list()
        for Tag in data["tags"]: Tags.append(Tag["name"])

        return Tags

    def __GetType(self, data: dict) -> str:
        """
        Получает тип тайтла.
            data – словарь данных тайтла.
        """

        Type = None

        TypeData = data.get("type") or {}
        SiteTypeLabel = TypeData.get("label") or ""
        SiteTypeId = TypeData.get("id")

        TypeById = {
            9: Types.western_comic,   # Комикс
            4: Types.oel,             # OEL-манга
            8: Types.russian_comic,   # Руманга
        }

        TypeByLabel = {
            "Манга": Types.manga,
            "Манхва": Types.manhwa,
            "Маньхуа": Types.manhua,
            "Руманга": Types.russian_comic,
            "Комикс": Types.western_comic,
            "Комикс западный": Types.western_comic,
            "OEL-манга": Types.oel,
        }

        if SiteTypeId in TypeById:
            Type = TypeById[SiteTypeId]
        else:
            NormalizedLabel = SiteTypeLabel.strip()
            if NormalizedLabel in TypeByLabel:
                Type = TypeByLabel[NormalizedLabel]

        return Type

    def __StringToDate(self, date_str: str) -> datetime:
        """
        Преобразует строковое время в объектную реализацию.
            date_str – строковая интерпретация.
        """

        DatePattern = "%Y-%m-%dT%H:%M:%S.%fZ"

        return datetime.strptime(date_str, DatePattern)

    #==========================================================================================#
    # >>>>> ПУБЛИЧНЫЕ МЕТОДЫ <<<<< #
    #==========================================================================================#

    def amend(self, branch: Branch, chapter: Chapter):
        """
        Дополняет главу дайными о слайдах.
            branch – данные ветви;\n
            chapter – данные главы.
        """

        Slides = self.__GetSlides(branch.id, chapter)
        for Slide in Slides: chapter.add_slide(Slide["link"], Slide["width"], Slide["height"])

    def amend_postprocessor(self, chapter: Chapter):
        """
        Вносит изменения в главу после дополнения её контентом. Запускается независимо от процесса дополнения.
        
        Переопределите данный метод для обработки.

        :param chapter: Данные главы.
        :type chapter: Chapter
        """

        if not self._Settings.custom["add_moderation_status"]: chapter.remove_extra_data("moderated")

    def collect(self, period: int | None = None, filters: str | None = None, pages: int | None = None) -> list[str]:
        """
        Собирает список тайтлов по заданным параметрам.
            period – количество часов до текущего момента, составляющее период получения данных;\n
            filters – строка, описывающая фильтрацию (подробнее в README.md);\n
            pages – количество запрашиваемых страниц каталога.
        """

        Updates = list()
        IsUpdatePeriodOut = False
        Page = 1
        UpdatesCount = 0
        Headers = {
            "Site-Id": str(self.__GetSiteID())
        }
        CurrentDate = datetime.utcnow()

        while not IsUpdatePeriodOut:
            Response = self._Requestor.get(f"https://{self.__API}/api/latest-updates?page={Page}", headers = Headers)

            if Response.status_code == 200:
                UpdatesPage = Response.json["data"]

                for UpdateNote in UpdatesPage:
                    Delta = CurrentDate - self.__StringToDate(UpdateNote["last_item_at"])
                    
                    if Delta.total_seconds() / 3600 <= period:
                        Updates.append(UpdateNote["slug_url"])
                        UpdatesCount += 1

                    else:
                        IsUpdatePeriodOut = True

            else:
                IsUpdatePeriodOut = True
                self._Portals.request_error(Response, f"Unable to request updates page {Page}.")


            if not IsUpdatePeriodOut:
                self._Portals.collect_progress_by_page(Page)
                Page += 1
                sleep(self._get_common_delay())

        return Updates

    def image(self, url: str) -> str | None:
        """
        Скачивает изображение с сайта во временный каталог парсера и возвращает имя файла.
            url – ссылка на изображение.
        """

    # Используем отдельный delay для изображений (меньше чем для API)
        image_delay = self._get_image_delay()

        Result = self._ImagesDownloader.temp_image(url)
        
        # Если загрузка успешна - добавляем delay перед следующим запросом
        if Result:
            sleep(image_delay)
            return Result
        
        # Если не удалось - пробуем другие серверы
        Servers = self.__GetImagesServers(all_sites = True)

        if self.__IsSlideLink(url, Servers):
            OriginalServer, ImageURI = self.__ParseSlideLink(url, Servers)
            Servers.remove(OriginalServer)

            for Server in Servers:
                Link = Server + ImageURI
                Result = self._ImagesDownloader.temp_image(Link)
                
                if Result: 
                    sleep(image_delay)
                    break
                elif Server != Servers[-1]: 
                    sleep(image_delay)

        return Result

    def _get_proxy_count(self) -> int:
        """Определяет количество доступных прокси для адаптации параллельной загрузки."""
        
        # Сначала проверяем settings.json (приоритет 1)
        if hasattr(self._Settings, 'proxy') and hasattr(self._Settings.proxy, 'enable') and self._Settings.proxy.enable:
            if hasattr(self._Settings.proxy, 'proxies') and self._Settings.proxy.proxies:
                proxy_count = len(self._Settings.proxy.proxies)
                print(f"[INFO] 🌐 Detected {proxy_count} proxies from settings.json")
                return proxy_count
        
        # Пробуем найти ProxyRotator (приоритет 2) - ТОТ ЖЕ КОД ЧТО В _InitializeRequestor
        try:
            import sys
            import os
            from pathlib import Path
            
            # Добавляем путь к MelonService в sys.path для импорта proxy_rotator
            melon_service_path = Path(__file__).parent.parent.parent
            if str(melon_service_path) not in sys.path:
                sys.path.insert(0, str(melon_service_path))
            
            from proxy_rotator import ProxyRotator
            
            # Создаём экземпляр ротатора для парсера
            rotator = ProxyRotator(parser="mangalib")
            
            if rotator.enabled and rotator.get_proxy_count() > 0:
                proxy_count = rotator.get_proxy_count()
                print(f"[INFO] 🌐 Detected {proxy_count} proxies from ProxyRotator")
                return proxy_count
                
        except ImportError:
            pass
        except Exception as e:
            print(f"[WARNING] ⚠️  Error detecting ProxyRotator: {e}")
        
        # По умолчанию считаем что 1 прокси (или прямое подключение)
        print(f"[INFO] 🌐 No proxies detected, using 1 worker")
        return 1
        cached = getattr(self, "_proxy_count_cache", None)
        if isinstance(cached, int) and cached > 0:
            return cached

        from pathlib import Path
        import sys
        import json

        melon_service_path = Path(__file__).parent.parent.parent
        if str(melon_service_path) not in sys.path:
            sys.path.insert(0, str(melon_service_path))

        proxy_count = 0

        try:
            from proxy_rotator import ProxyRotator
            rotator = ProxyRotator(parser="mangalib")
            if rotator.enabled:
                proxy_count = rotator.get_proxy_count()
        except Exception as e:
            print(f"[WARNING] ProxyRotator not available: {e}")

        if proxy_count <= 0:
            try:
                settings_path = Path(__file__).parent / "settings.json"
                if settings_path.exists():
                    with open(settings_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        prox_list = data.get("Main", {}).get("proxy", [])
                        if isinstance(prox_list, list):
                            proxy_count = len(prox_list)
            except Exception as e:
                print(f"[WARNING] Unable to read proxy count from settings: {e}")

        proxy_count = max(1, proxy_count)
        self._proxy_count_cache = proxy_count
        return proxy_count

    def batch_download_images(self, urls: list[str]) -> list[str | None]:
        """Параллельная загрузка батча изображений.
        
        :param urls: Список URL изображений
        :return: Список имён файлов (или None для неудачных загрузок) в том же порядке
        """
        
        if not urls:
            return []

        import time

        batch_started_at = time.perf_counter()
        progress_state = {
            "last_log_at": batch_started_at,
            "last_downloaded": 0
        }

        report_every = max(10, len(urls) // 12) if len(urls) > 0 else 1
        min_seconds_between_logs = 15.0

        def progress_callback(downloaded: int, total: int):
            if total <= 0:
                return

            now = time.perf_counter()
            should_log = (
                downloaded == total
                or downloaded - progress_state["last_downloaded"] >= report_every
                or (now - progress_state["last_log_at"]) >= min_seconds_between_logs
            )

            if not should_log:
                return

            percent = (downloaded / total) * 100
            # Убираем подробный debug лог прогресса - важные метрики в MangaBuilder
            progress_state["last_log_at"] = now
            progress_state["last_downloaded"] = downloaded

        # Используем параллельный загрузчик с отслеживанием прогресса
        results = self._parallel_downloader.download_batch(urls, progress_callback=progress_callback)

        elapsed = max(time.perf_counter() - batch_started_at, 0.0001)

        # Преобразуем результаты в список имён файлов (сохраняя порядок)
        from urllib.parse import urlparse, unquote

        total_images = len(urls)
        filenames: list[str | None] = [None] * total_images
        failed_indices: list[int] = []
        fallback_attempts = 0
        successful_downloads = 0

        def _expected_filename(target_url: str) -> str:
            parsed = urlparse(target_url)
            raw_name = parsed.path.split('/')[-1]
            return unquote(raw_name)

        for result in results:
            index = result.get('index', 0) - 1
            url = result.get('url')

            if index < 0 or index >= total_images:
                if url:
                    self._SystemObjects.logger.warning(
                        f"Received download result with invalid index: idx={index}, url={url}"
                    )
                continue

            if result.get('success'):
                filenames[index] = result.get('filename')
                successful_downloads += 1
                continue

            # Не удалось скачать — пробуем альтернативные сервера
            fallback_attempts += 1
            fallback_filename: str | None = None
            fallback_status = self._try_alternative_servers(url)

            if fallback_status:
                if hasattr(fallback_status, "value") and fallback_status.value:
                    fallback_filename = fallback_status.value
                elif isinstance(fallback_status, str):
                    fallback_filename = fallback_status
                elif hasattr(fallback_status, "filename") and fallback_status.filename:
                    fallback_filename = fallback_status.filename

            if not fallback_filename and url:
                # Проверяем, появился ли файл в temp после фолбэка
                if self._ImagesDownloader.is_exists(url):
                    fallback_filename = _expected_filename(url)

            if fallback_filename:
                filenames[index] = fallback_filename
                successful_downloads += 1
            else:
                failed_indices.append(index)

        # Дополнительный медленный фолбэк: последовательные попытки для оставшихся
        if failed_indices:
            slow_delay = max(self._get_image_delay() * 3, 0.6)
            max_additional_attempts = 3

            self._SystemObjects.logger.warning(
                f"Sequential fallback engaged for {len(failed_indices)} images (delay {slow_delay:.2f}s)"
            )

            for idx in failed_indices:
                url = urls[idx]
                recovered = False

                for attempt in range(1, max_additional_attempts + 1):
                    sleep(slow_delay * attempt)
                    sequential_filename = self._download_image_wrapper(url)

                    if sequential_filename:
                        filenames[idx] = sequential_filename
                        successful_downloads += 1
                        recovered = True
                        self._SystemObjects.logger.info(
                            f"✅ Sequential fallback recovered image {idx + 1}/{total_images} (attempt {attempt})"
                        )
                        break

                if not recovered:
                    filenames[idx] = None
                    self._SystemObjects.logger.error(
                        f"❌ Unable to recover image {idx + 1}/{total_images} after sequential fallback: {url}"
                    )

        failed_after_fallback = total_images - successful_downloads
        avg_speed = successful_downloads / elapsed if elapsed > 0 else 0

        # Убираем подробный debug лог завершения - важные метрики в MangaBuilder

        return filenames

    def _try_alternative_servers(self, url: str) -> str | None:
        """Попытка загрузить изображение с альтернативных серверов (fallback)."""
        
        Servers = self.__GetImagesServers(all_sites=True)
        
        if self.__IsSlideLink(url, Servers):
            OriginalServer, ImageURI = self.__ParseSlideLink(url, Servers)
            
            try:
                Servers.remove(OriginalServer)
            except ValueError:
                pass
            
            for Server in Servers:
                Link = Server + ImageURI
                Result = self._ImagesDownloader.temp_image(Link)
                
                if Result:
                    return Result
        
        return None

    def parse(self):
        """Получает основные данные тайтла."""

        print(f"[DEBUG] 🚀 Starting parse() for title: {self._Title.slug}")
        
        self._Requestor.config.add_header("Site-Id", str(self.__Sites[self._Manifest.site]))

        # MangaLib изменил структуру: теперь slug'и из API имеют формат "ID--slug"
        # Проверяем, содержит ли slug ID (формат: "7580--i-alone-level-up")
        
        # Сохраняем slug для обработки
        slug_with_id = self._Title.slug
        clean_slug = self._Title.slug
        extracted_id = None
        
        if "--" in self._Title.slug:
            # Извлекаем ID и slug из формата "ID--slug"
            parts = self._Title.slug.split("--", 1)
            if len(parts) == 2 and parts[0].isdigit():
                extracted_id = int(parts[0])
                clean_slug = parts[1]
                print(f"[DEBUG] Extracted: ID={extracted_id}, slug={clean_slug}")
        
        # API требует полный slug (ID--slug)
        self.__TitleSlug = slug_with_id
        # Файл сохраняется без ID
        self._Title.set_slug(clean_slug)

        print(f"[DEBUG] TitleSlug (API): {self.__TitleSlug}")
        print(f"[DEBUG] Title.slug (file): {self._Title.slug}")

        Data = self.__GetTitleData()
        
        print(f"[DEBUG] 📦 GetTitleData returned: {type(Data)}, is None: {Data is None}")
        if Data:
            print(f"[DEBUG] ✅ Data keys: {list(Data.keys())[:10] if isinstance(Data, dict) else 'NOT A DICT'}")
        
        self._SystemObjects.manager.get_parser_settings()

        if Data:
            self._Title.set_site(self.__CheckCorrectDomain(Data))
            
            # ID устанавливаем из извлечённого или из API
            if extracted_id is not None:
                self._Title.set_id(extracted_id)
                if extracted_id != Data["id"]:
                    print(f"[WARNING] ID mismatch: extracted={extracted_id}, API={Data['id']} (using extracted)")
            else:
                self._Title.set_id(Data["id"])
            
            # Slug УЖЕ установлен выше (чистый, без ID)
            print(f"[DEBUG] Final slug (file): {self._Title.slug}")
            print(f"[DEBUG] Final ID: {self._Title.id}")
            
            self._Title.set_content_language("rus")
            self._Title.set_localized_name(Data["rus_name"])
            self._Title.set_eng_name(Data["eng_name"])
            self._Title.set_another_names(Data["otherNames"])
            if Data["name"] not in Data["otherNames"] and Data["name"] != Data["rus_name"] and Data["name"] != Data["eng_name"]: self._Title.add_another_name(Data["name"])
            self._Title.set_covers(self.__GetCovers(Data))
            self._Title.set_authors(self.__GetAuthors(Data))
            self._Title.set_publication_year(int(Data["releaseDate"]) if Data["releaseDate"] else None)
            self._Title.set_description(self.__GetDescription(Data))
            self._Title.set_age_limit(self.__GetAgeLimit(Data))
            self._Title.set_type(self.__GetType(Data))
            self._Title.set_status(self.__GetStatus(Data))
            self._Title.set_is_licensed(Data["is_licensed"])
            self._Title.set_genres(self.__GetGenres(Data))
            self._Title.set_tags(self.__GetTags(Data))
            self._Title.set_franchises(self.__GetFranchises(Data))

            self.__GetBranches()