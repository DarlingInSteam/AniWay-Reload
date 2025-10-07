from Source.Core.Base.Formats.Manga import Branch, Chapter, Types
from Source.Core.Base.Parsers.MangaParser import MangaParser
from Source.Core.Base.Formats.BaseFormat import Statuses

from dublib.Methods.Data import RemoveRecurringSubstrings, Zerotify
from dublib.WebRequestor import WebRequestor

from datetime import datetime
from time import sleep

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
        
        # НОВОЕ: Выводим прогресс парсинга в stdout для захвата логов
        chapter_name = f"{chapter.volume}.{chapter.number}" if chapter.volume else str(chapter.number)
        if chapter.name:
            chapter_name += f" - {chapter.name}"
        print(f"[{current_chapter_index}/{total_chapters}] Chapter {chapter_name} parsing...")
        
        # Логируем начало парсинга главы через Portals
        self._Portals.chapter_parsing_start(self._Title, chapter, current_chapter_index, total_chapters)

        Slides = self.__GetSlides(branch.id, chapter)

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
        import threading
        import requests
        
        thread_id = threading.current_thread().name
        print(f"[CRITICAL_DEBUG] [{thread_id}] ⭐ WRAPPER CALLED for {url[:80]}...", flush=True)
        
        directory = self._SystemObjects.temper.parser_temp
        
        # Определяем имя файла из URL
        parsed_url = Path(url)
        filetype = parsed_url.suffix
        filename = parsed_url.stem
        image_path = f"{directory}/{filename}{filetype}"
        
        print(f"[CRITICAL_DEBUG] [{thread_id}] Checking cache: {image_path}", flush=True)
        
        # Если файл уже существует и не FORCE_MODE, возвращаем имя
        if os.path.exists(image_path) and not self._SystemObjects.FORCE_MODE:
            print(f"[CRITICAL_DEBUG] [{thread_id}] ✅ Cache HIT", flush=True)
            return filename + filetype
        
        print(f"[CRITICAL_DEBUG] [{thread_id}] 📥 Cache MISS, starting download...", flush=True)
        
        try:
            print(f"[CRITICAL_DEBUG] [{thread_id}] Getting requestor...", flush=True)
            # Получаем основной WebRequestor
            requestor = self._ImagesDownloader._ImagesDownloader__Requestor
            print(f"[CRITICAL_DEBUG] [{thread_id}] Got requestor: {type(requestor)}", flush=True)
            
            # Создаем НЕЗАВИСИМУЮ сессию requests для этого потока
            print(f"[CRITICAL_DEBUG] [{thread_id}] Creating requests.Session()...", flush=True)
            session = requests.Session()
            print(f"[CRITICAL_DEBUG] [{thread_id}] Session created!", flush=True)
            
            print(f"[CRITICAL_DEBUG] [{thread_id}] Looking for source session...", flush=True)
            # Копируем cookies из WebRequestor Session (thread-safe read)
            # Проверяем разные возможные атрибуты WebRequestor
            source_session = None
            if hasattr(requestor, '_WebRequestor__Session'):
                source_session = requestor._WebRequestor__Session
                print(f"[CRITICAL_DEBUG] [{thread_id}] Found _WebRequestor__Session", flush=True)
            elif hasattr(requestor, 'session'):
                source_session = requestor.session
                print(f"[CRITICAL_DEBUG] [{thread_id}] Found session", flush=True)
            elif hasattr(requestor, '_session'):
                source_session = requestor._session
                print(f"[CRITICAL_DEBUG] [{thread_id}] Found _session", flush=True)
            
            if source_session and hasattr(source_session, 'cookies'):
                print(f"[CRITICAL_DEBUG] [{thread_id}] Copying cookies... (getting dict first)", flush=True)
                # КРИТИЧНО: НЕ используем update() напрямую - это вызывает deadlock!
                # Сначала получаем dict, потом обновляем
                try:
                    cookies_dict = dict(source_session.cookies)
                    print(f"[CRITICAL_DEBUG] [{thread_id}] Got {len(cookies_dict)} cookies as dict", flush=True)
                    for name, value in cookies_dict.items():
                        session.cookies.set(name, value)
                    print(f"[CRITICAL_DEBUG] [{thread_id}] ✅ Cookies copied!", flush=True)
                except Exception as e:
                    print(f"[WARNING] [{thread_id}] Failed to copy cookies: {e}", flush=True)
            
            # Копируем headers из source session
            if source_session and hasattr(source_session, 'headers'):
                print(f"[CRITICAL_DEBUG] [{thread_id}] Copying headers...", flush=True)
                try:
                    headers_dict = dict(source_session.headers)
                    session.headers.update(headers_dict)
                    print(f"[CRITICAL_DEBUG] [{thread_id}] ✅ Headers copied!", flush=True)
                except Exception as e:
                    print(f"[WARNING] [{thread_id}] Failed to copy headers: {e}", flush=True)
            
            print(f"[CRITICAL_DEBUG] [{thread_id}] Adding standard image headers...", flush=True)
            # Добавляем стандартные headers для изображений
            session.headers.update({
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
                'Referer': 'https://mangalib.me/',
            })
            print(f"[CRITICAL_DEBUG] [{thread_id}] ✅ Headers updated!", flush=True)
            
            # Получаем прокси (опционально)
            print(f"[CRITICAL_DEBUG] [{thread_id}] Getting proxy from ProxyRotator...", flush=True)
            proxies = None
            if hasattr(self, '_ProxyRotator') and self._ProxyRotator:
                proxy = self._ProxyRotator.get_next_proxy()
                print(f"[CRITICAL_DEBUG] [{thread_id}] Got proxy: {proxy}", flush=True)
                if proxy and isinstance(proxy, dict):
                    proxies = proxy
            else:
                print(f"[CRITICAL_DEBUG] [{thread_id}] No ProxyRotator, using direct connection", flush=True)
            
            # ПАРАЛЛЕЛЬНЫЙ HTTP запрос через независимую сессию!
            print(f"[CRITICAL_DEBUG] [{thread_id}] 🌐 Starting HTTP GET request...", flush=True)
            response = session.get(url, timeout=30, proxies=proxies)
            print(f"[CRITICAL_DEBUG] [{thread_id}] ✅ Got response: {response.status_code}, size: {len(response.content)}", flush=True)
            
            if response.status_code == 200 and len(response.content) > 1000:
                with open(image_path, "wb") as f:
                    f.write(response.content)
                return filename + filetype
            
        except Exception as e:
            print(f"[WARNING] [{thread_id}] Failed to download {url}: {e}", flush=True)
            import traceback
            traceback.print_exc()
        finally:
            # Закрываем сессию
            if 'session' in locals():
                session.close()
        
        return None
    
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
        image_delay = getattr(self._Settings.common, 'image_delay', 0.2)
        
        print(f"[CRITICAL_DEBUG] proxy_count={proxy_count}, image_delay={image_delay}", flush=True)
        
        # НЕ НУЖЕН Lock — каждый поток создает свою сессию requests!
        self._parallel_downloader = AdaptiveParallelDownloader(
            proxy_count=proxy_count,
            download_func=self._download_image_wrapper,
            max_workers_per_proxy=2,
            max_retries=3,
            base_delay=image_delay
        )
        
        print(f"[CRITICAL_DEBUG] AdaptiveParallelDownloader CREATED successfully!", flush=True)

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
            sleep(self._Settings.common.delay)

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
            sleep(self._Settings.common.delay)

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
        
        Server = self.__GetImagesServers(self._Settings.custom["server"])[0]
        Branch = "" if branch_id == str(self._Title.id) + "0" else f"&branch_id={branch_id}"
        URL = f"https://{self.__API}/api/manga/{self.__TitleSlug}/chapter?number={chapter.number}&volume={chapter.volume}{Branch}"
        Response = self._Requestor.get(URL)
        
        if Response.status_code == 200:
            Data = Response.json["data"].setdefault("pages", tuple())
            sleep(self._Settings.common.delay)

            for SlideIndex in range(len(Data)):
                Buffer = {
                    "index": SlideIndex + 1,
                    "link": Server + Data[SlideIndex]["url"].replace(" ", "%20"),
                    "width": Data[SlideIndex]["width"],
                    "height": Data[SlideIndex]["height"]
                }
                Slides.append(Buffer)

                # Логируем загрузку каждого изображения
                self._Portals.chapter_download_start(self._Title, chapter, SlideIndex + 1, len(Data))

        else: self._Portals.request_error(Response, "Unable to request chapter content.", exception = False)

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
            sleep(self._Settings.common.delay)

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
        TypesDeterminations = {
            "Манга": Types.manga,
            "Манхва": Types.manhwa,
            "Маньхуа": Types.manhua,
            "Руманга": Types.russian_comic,
            "Комикс западный": Types.western_comic,
            "OEL-манга": Types.oel
        }
        SiteType = data["type"]["label"]
        if SiteType in TypesDeterminations.keys(): Type = TypesDeterminations[SiteType]

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
                sleep(self._Settings.common.delay)

        return Updates

    def image(self, url: str) -> str | None:
        """
        Скачивает изображение с сайта во временный каталог парсера и возвращает имя файла.
            url – ссылка на изображение.
        """

        # Используем отдельный delay для изображений (меньше чем для API)
        image_delay = getattr(self._Settings.common, 'image_delay', 0.2)

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

    def batch_download_images(self, urls: list[str]) -> list[str | None]:
        """Параллельная загрузка батча изображений.
        
        :param urls: Список URL изображений
        :return: Список имён файлов (или None для неудачных загрузок) в том же порядке
        """
        
        print(f"[INFO] [DEBUG] ✅ batch_download_images() CALLED with {len(urls)} URLs")
        print(f"[INFO] [DEBUG] _parallel_downloader initialized: {hasattr(self, '_parallel_downloader')}")
        
        if not urls:
            print(f"[INFO] [DEBUG] ⚠️ No URLs provided, returning empty list")
            return []
        
        print(f"[INFO] [DEBUG] 🚀 Starting parallel download with {len(urls)} images...")
        
        # Используем параллельный загрузчик
        results = self._parallel_downloader.download_batch(urls)
        
        # Преобразуем результаты в список имён файлов (сохраняя порядок)
        filenames = []
        for result in results:
            if result['success']:
                filenames.append(result['filename'])
            else:
                # Для неудачных загрузок пробуем альтернативные серверы
                fallback_result = self._try_alternative_servers(result['url'])
                filenames.append(fallback_result)
        
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