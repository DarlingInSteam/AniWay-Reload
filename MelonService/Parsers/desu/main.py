from Source.Core.Base.Formats.Manga import Branch, Chapter, Types
from Source.Core.Base.Parsers.MangaParser import MangaParser
from Source.Core.Base.Formats.BaseFormat import Statuses

from dublib.Methods.Data import RemoveRecurringSubstrings

from datetime import datetime
from time import sleep
import json
import re

from bs4 import BeautifulSoup
import dateparser

class Parser(MangaParser):
	"""Парсер."""

	#==========================================================================================#
	# >>>>> ПРИВАТНЫЕ МЕТОДЫ <<<<< #
	#==========================================================================================#

	def __ParseMetadata(self, soup: BeautifulSoup):
		"""
		Парсит метаданные тайтла.

		:param soup: HTML код страницы.
		:type soup: BeautifulSoup
		"""

		LineContainers = soup.find_all("div", {"class": "line-container"})

		StatusesDeterminations = {
			"": Statuses.announced,
			"продолжается": Statuses.ongoing,
			"": Statuses.dropped,
			"завершён": Statuses.completed,
			"": None
		}
		TypesDeterminations = {
			"Манга": Types.manga,
			"Манхва": Types.manhwa,
			"Маньхуа": Types.manhua,
		}

		for Container in LineContainers:
			
			if "Статус:" in str(Container):
				Years = BeautifulSoup(str(Container), "html.parser").find("div", {"class": "value"}).get_text()
				Match = re.search("\\d{4}", str(Years))
				self._Title.set_publication_year(None if Match[0] == None else int(Match[0]))
			
			elif "Перевод:" in str(Container):
				Status = BeautifulSoup(str(Container), "html.parser").find("div", {"class": "value"}).get_text().strip()
				if Status in StatusesDeterminations: self._Title.set_status(StatusesDeterminations[Status])
					
			elif "Тип:" in str(Container):
				Type = BeautifulSoup(str(Container), "html.parser").find("div", {"class": "value"}).get_text().strip()
				if Type in TypesDeterminations: self._Title.set_type(TypesDeterminations[Type])

	def __BuildChapterID(self, volume: str, number: str) -> int:
		"""
		Генерирует повторяемый ID главы.

		:param volume: Номер тома.
		:type volume: str
		:param number: Номер главы.
		:type number: str
		:return: Синтетический ID главы.
		:rtype: int
		"""
		volume = volume.replace(".", "")
		number = number.replace(".", "")
		
		return int(f"{self._Title.id}0{volume}0{number}")

	def __GetBranch(self, soup: BeautifulSoup) -> Branch:
		"""
		Парсит данные глав.

		:param soup: HTML код страницы.
		:type soup: BeautifulSoup
		:return: Данные глав в виде ветви.
		:rtype: Branch
		"""

		ChaptersContainer = soup.find("ul", {"class": "chlist"})
		Soup = BeautifulSoup(str(ChaptersContainer), "html.parser")
		ChaptersLinks = Soup.find_all("a")
		BranchObject = Branch(self._Title.id)

		for Link in ChaptersLinks:
			Buffer = Chapter(self._SystemObjects)
			Buffer.set_volume(re.search(r"Том \d+(\.\d+)?", Link.get_text())[0].replace("Том ", ""))
			Buffer.set_number(re.search(r"Глава \d+(\.\d+)?", Link.get_text())[0].replace("Глава ", ""))
			Buffer.set_id(self.__BuildChapterID(Buffer.volume, Buffer.number))
			Buffer.set_slug(Link["href"].split(self._Title.slug)[-1].lstrip("/"))

			ChapterNameBlock = BeautifulSoup(str(Link), "html.parser").find("span", {"class": "title nowrap"})
			if ChapterNameBlock: Buffer.set_name(ChapterNameBlock.get_text().lstrip(" -"))
				
			BranchObject.add_chapter(Buffer)

		return BranchObject

	def __GetCovers(self, soup: BeautifulSoup) -> list[dict]:
		"""
		Получает данные об обложках.

		:param soup: HTML код страницы.
		:type soup: BeautifulSoup
		:return: Список словарей данных обложек.
		:rtype: list[dict]
		"""

		CoversList = list()
		CoverHTML = soup.find("img", {"itemprop": "image"})
		Cover = {
			"link": None,
			"filename": None
		}

		if "src" in CoverHTML.attrs.keys():

			if CoverHTML["src"]:
				Cover["link"] = CoverHTML["src"].split("?")[0]
				Cover["filename"] = Cover["link"].split('/')[-1]
				CoversList.append(Cover)

		return CoversList

	def __GetGenres(self, soup: BeautifulSoup) -> tuple[str]:
		"""
		Получает список жанров.

		:param soup: HTML код страницы.
		:type soup: BeautifulSoup
		:return: Список жанров.
		:rtype: tuple[str]
		"""

		Genres = list()
		TagsContainer = soup.find("ul", {"class": "tagList"})
		AllGenres = BeautifulSoup(str(TagsContainer), "html.parser").find_all("a")
		for Genre in AllGenres: Genres.append(Genre.get_text().lower())
		Genres = tuple(filter(lambda Value: not Value.startswith("#"), Genres))

		return Genres
	
	def __GetTags(self, soup: BeautifulSoup) -> tuple[str]:
		"""
		Получает список тегов.

		:param soup: HTML код страницы.
		:type soup: BeautifulSoup
		:return: Список тегов.
		:rtype: list[str]
		"""

		Tags = list()
		TagsContainer = soup.find("ul", {"class": "tagList"})
		AllTags = BeautifulSoup(str(TagsContainer), "html.parser").find_all("a")
		for Genre in AllTags: Tags.append(Genre.get_text().lower())
		Tags = tuple(filter(lambda Value: Value.startswith("#"), Tags))
		Tags = tuple(Value.lstrip(" #") for Value in Tags)

		return Tags

	def __GetFromSlugID(self) -> int:
		"""
		Получает ID тайтла из алиаса.

		:return: ID тайтла.
		:rtype: int
		"""

		return int(self._Title.slug.split(".")[-1])

	def __GetSlides(self, chapter: Chapter) -> list[dict]:
		"""
		Получает данные слайдов.

		:param chapter: Данные главы.
		:type chapter: Chapter
		:return: Список словарей данных слайдов.
		:rtype: list[dict]
		"""

		Slides = list()
		Response = self._Requestor.get(f"https://{self._Manifest.site}/manga/{self._Title.slug}/{chapter.slug}#page=1")

		if Response.status_code == 200:
			Soup = BeautifulSoup(Response.text, "html.parser")
			Scripts = Soup.find_all("script", {"type": "text/javascript"})
			Data = None
			Dir = None
			
			for Script in Scripts:
				
				if self._Title.slug in str(Script):
					Data = json.loads(str(Script).split("images:")[-1].split("page:")[0].strip().strip(","))
					Dir = str(Script).split("dir:")[-1].split("mangaUrl:")[0].strip().strip("\",")
			
			if Data != None and Dir != None:
				
				for SlideIndex in range(0, len(Data)):
					Slide = {
						"index": SlideIndex + 1,
						"link": f"https:" + Dir + Data[SlideIndex][0],
						"width": Data[SlideIndex][1],
						"height": Data[SlideIndex][2]
					}
					Slides.append(Slide)
			
		return Slides

	#==========================================================================================#
	# >>>>> ПУБЛИЧНЫЕ МЕТОДЫ <<<<< #
	#==========================================================================================#

	def amend(self, branch: Branch, chapter: Chapter):
		"""
		Дополняет главу дайными о слайдах.
			branch – данные ветви;\n
			chapter – данные главы.
		"""

		Slides = self.__GetSlides(chapter)
		for Slide in Slides: chapter.add_slide(Slide["link"], Slide["width"], Slide["height"])
	
	def collect(self, period: int | None = None, filters: str | None = None, pages: int | None = None) -> list[str]:
		"""
		Собирает список тайтлов по заданным параметрам.
			period – количество часов до текущего момента, составляющее период получения данных;\n
			filters – строка, описывающая фильтрацию (подробнее в README.md);\n
			pages – количество запрашиваемых страниц каталога.
		"""

		Updates = list()
		PageIndex = 1
		IsAllUpdatesRecieved = False
		Now = datetime.now()

		while not IsAllUpdatesRecieved:
			UpdatedTitlesBlocks = list()
			Response = self._Requestor.get(f"https://{self._Manifest.site}/manga/?page={PageIndex}")
			self._Portals.collect_progress_by_page(PageIndex)
			Soup = BeautifulSoup(Response.text, "html.parser")
			TitlesBlocks = Soup.find_all("li", {"class": "primaryContent memberListItem"})
			PageIndex += 1
			
			for Block in TitlesBlocks:
				DateBlock = Block.find_all("dd")[-1]
				Delta = Now - dateparser.parse(DateBlock.get_text())

				if Delta.total_seconds() / 3600 < period: UpdatedTitlesBlocks.append(str(Block))
				else: IsAllUpdatesRecieved = True
				
			if not len(TitlesBlocks): break

			for Block in UpdatedTitlesBlocks:
				Soup = BeautifulSoup(Block, "html.parser")
				TitleLink = Soup.find("a")
				Slug = TitleLink["href"].replace("manga/", "").strip('/')
				Updates.append(Slug)
				
			if IsAllUpdatesRecieved == False: sleep(self._Settings.common.delay)
			
		return Updates

	def parse(self):
		"""Получает основные данные тайтла."""

		TitleURL = f"https://{self._Manifest.site}/manga/{self._Title.slug}"
		Response = self._Requestor.get(TitleURL)
		if Response.status_code != 200: self._Portals.request_error(Response, "Unable get title data.")

		Soup = BeautifulSoup(Response.text, "html.parser")
		self._Title.set_site(self._Manifest.site)
		self._Title.set_id(self.__GetFromSlugID())
		self._Title.set_content_language("rus")
		self._Title.set_localized_name(Soup.find("span", {"class": "rus-name"}).get_text())
		self._Title.set_eng_name(Soup.find("span", {"class": "name"}).get_text())

		AnotherNamesBlock = Soup.find("span", {"class": "alternativeHeadline"})
		if AnotherNamesBlock: self._Title.set_another_names(AnotherNamesBlock.get_text().split(", "))

		self._Title.set_covers(self.__GetCovers(Soup))
		self._Title.set_description(RemoveRecurringSubstrings(Soup.find("div", {"class": "prgrph"}).get_text().replace("<br>", "\n").strip(), "\n"))
		
		self._Title.set_is_licensed(False)
		self._Title.set_genres(self.__GetGenres(Soup))
		self._Title.set_tags(self.__GetTags(Soup))
		self._Title.add_branch(self.__GetBranch(Soup))

		AgeLimit = 0
		if "хентай" in self._Title.genres: AgeLimit = 18
		elif "эротика" in self._Title.genres: AgeLimit = 16
		self._Title.set_age_limit(AgeLimit)

		self.__ParseMetadata(Soup)