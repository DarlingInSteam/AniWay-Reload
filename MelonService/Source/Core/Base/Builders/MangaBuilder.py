from Source.Core.Base.Builders.BaseBuilder import BaseBuilder

from dublib.Methods.Filesystem import ListDir, NormalizePath

from typing import TYPE_CHECKING
import shutil
import enum
import os
from urllib.parse import urlparse, unquote

if TYPE_CHECKING:
	from Source.Core.Base.Parsers.MangaParser import MangaParser
	from Source.Core.Base.Formats.Manga import Branch, Chapter, Manga

#==========================================================================================#
# >>>>> ВСПОМОГАТЕЛЬНЫЕ СТРУКТУРЫ ДАННЫХ <<<<< #
#==========================================================================================#

class MangaBuildSystems(enum.Enum):
	"""Перечисление систем сборки глав манги."""

	Simple = "simple"
	ZIP = "zip"
	CBZ = "cbz"

#==========================================================================================#
# >>>>> ОСНОВНОЙ КЛАСС <<<<< #
#==========================================================================================#

class MangaBuilder(BaseBuilder):
	"""Сборщик манги."""

	#==========================================================================================#
	# >>>>> СИСТЕМЫ СБОРКИ <<<<< #
	#==========================================================================================#

	def __cbz(self, title: "Manga", chapter: "Chapter", directory: str) -> str:
		"""Система сборки: *.CBZ-архив."""

		ArchivePath = self.__zip(title, chapter, directory)
		OutputPath = ArchivePath[:-3] + "cbz"
		os.rename(ArchivePath, OutputPath)

		return OutputPath

	def __simple(self, title: "Manga", chapter: "Chapter", directory: str) -> str:
		"""Система сборки: каталог с изображениями."""

		ChapterName = self._GenerateChapterNameByTemplate(chapter)
		Volume = ""
		if self._SortingByVolumes and chapter.volume: Volume = self._GenerateVolumeNameByTemplate(chapter)
		OutputPath = f"{self._ParserSettings.common.archives_directory}/{title.used_filename}/{Volume}/{ChapterName}"
		OutputPath = NormalizePath(OutputPath)

		if not os.path.exists(OutputPath): os.makedirs(OutputPath)
		Files = ListDir(directory)
		for File in Files: shutil.move(f"{directory}/{File}", f"{OutputPath}/{File}")

		return OutputPath

	def __zip(self, title: "Manga", chapter: "Chapter", directory: str) -> str:
		"""Система сборки: *.ZIP-архив."""

		ChapterName = self._GenerateChapterNameByTemplate(chapter)
		Volume = ""
		if self._SortingByVolumes and chapter.volume: Volume = self._GenerateVolumeNameByTemplate(chapter)
		OutputPath = f"{self._ParserSettings.common.archives_directory}/{title.used_filename}/{Volume}/{ChapterName}"
		OutputPath = NormalizePath(OutputPath)

		shutil.make_archive(OutputPath, "zip", directory)

		return OutputPath + ".zip"

	#==========================================================================================#
	# >>>>> ПЕРЕОПРЕДЕЛЯЕМЫЕ МЕТОДЫ <<<<< #
	#==========================================================================================#

	def _PostInitMethod(self):
		"""Метод, выполняющийся после инициализации объекта."""

		self.__BuildSystemsMethods = {
			MangaBuildSystems.Simple: self.__simple,
			MangaBuildSystems.CBZ: self.__cbz,
			MangaBuildSystems.ZIP: self.__zip,
		}

	#==========================================================================================#
	# >>>>> ПУБЛИЧНЫЕ МЕТОДЫ <<<<< #
	#==========================================================================================#

	def build_chapter(self, title: "Manga", chapter_id: int):
		"""
		Строит главу манги.
			title – данные тайтла;\n
			chapter_id – ID целевой главы;\n
			build_system – система сборки главы.
		"""

		if not self._BuildSystem: self._BuildSystem = MangaBuildSystems.Simple

		TargetChapter: "Chapter" = self._FindChapter(title.branches, chapter_id)
		
		# Создаем красивое отображение главы
		chapter_display_parts = []
		if hasattr(TargetChapter, 'volume') and TargetChapter.volume:
			chapter_display_parts.append(f"Vol.{TargetChapter.volume}")
		if hasattr(TargetChapter, 'number') and TargetChapter.number is not None:
			chapter_display_parts.append(f"Ch.{TargetChapter.number}")
		elif hasattr(TargetChapter, 'chapter') and TargetChapter.chapter is not None:
			chapter_display_parts.append(f"Ch.{TargetChapter.chapter}")
		
		chapter_display = " ".join(chapter_display_parts) if chapter_display_parts else f"Chapter {chapter_id}"
		if hasattr(TargetChapter, 'name') and TargetChapter.name:
			chapter_display += f": {TargetChapter.name}"
		SlidesCount = len(TargetChapter.slides)
		WorkDirectory = f"{self._Temper.builder_temp}/{title.used_filename}"

		Parser: "MangaParser" = title.parser
		
		# КРИТИЧЕСКИ ВАЖНО: Если парсер загружен из JSON, нужно инициализировать _parallel_downloader
		if hasattr(Parser, 'batch_download_images'):
			# Проверяем, инициализирован ли _parallel_downloader  
			if not hasattr(Parser, '_parallel_downloader') or Parser._parallel_downloader is None:
				if hasattr(Parser, '_PostInitMethod'):
					Parser._PostInitMethod()
		
		# Проверяем, есть ли у парсера метод batch_download_images
		if hasattr(Parser, 'batch_download_images'):
			import time
			start_time = time.time()
			
			# Собираем все URL для параллельной загрузки
			urls = [Slide["link"] for Slide in TargetChapter.slides]
			
			# Параллельная загрузка
			filenames = Parser.batch_download_images(urls)
			
			download_time = time.time() - start_time
			images_per_second = SlidesCount / download_time if download_time > 0 else 0
			
			# Подсчет успешных загрузок
			successful = sum(1 for f in filenames if f is not None)
			failed = SlidesCount - successful
			
			# СИНИЙ ЛОГ: Информация о скачанной главе с метриками
			if failed > 0:
				self._SystemObjects.logger.info(f"\033[94m📥 {chapter_display} - {successful}/{SlidesCount} images ({images_per_second:.1f} img/sec, {failed} failed)\033[0m")
			else:
				self._SystemObjects.logger.info(f"\033[94m📥 {chapter_display} - {SlidesCount} images ({images_per_second:.1f} img/sec)\033[0m")
			
			# Дополнительная диагностика при низкой скорости
			if images_per_second < 1.0 and SlidesCount > 3:
				avg_time_per_image = download_time / SlidesCount
				self._SystemObjects.logger.warning(f"⚠️ Slow download detected: {avg_time_per_image:.1f}s per image (might be large files or slow server)")
			
			# Обработка результатов и перемещение файлов
			if not os.path.exists(WorkDirectory): 
				os.makedirs(WorkDirectory, exist_ok=True)
			
			for idx, (Slide, downloaded_filename) in enumerate(zip(TargetChapter.slides, filenames), start=1):
				parsed_url = urlparse(Slide["link"])
				raw_filename = parsed_url.path.split("/")[-1]
				Filename: str = unquote(raw_filename) or Slide["link"].split("/")[-1]
				Index: int = Slide["index"]
				
				if downloaded_filename:
					# Перемещаем файл из temp в рабочую директорию
					MovingStatus = self._Parser.images_downloader.move_from_temp(
						WorkDirectory, Filename, f"{Index}", is_full_filename=False
					)
					MovingStatus.print_messages()
				else:
					self._SystemObjects.logger.error(f"Unable download slide \"{Filename}\" ({idx}/{SlidesCount}).")
		
		else:
			# FALLBACK: Старый последовательный метод (если batch_download_images недоступен)
			import time
			start_time = time.time()
			
			for Slide in TargetChapter.slides:
				Link: str = Slide["link"]
				parsed_url = urlparse(Link)
				raw_filename = parsed_url.path.split("/")[-1]
				Filename: str = unquote(raw_filename) or Link.split("/")[-1]
				Index: int = Slide["index"]
				
				if not os.path.exists(WorkDirectory): os.mkdir(WorkDirectory)
				DownloadingStatus = Parser.image(Link)
				DownloadingStatus.print_messages()

				if not DownloadingStatus.has_errors:
					pass  # Убрали лишние DEBUG логи
				else: 
					self._SystemObjects.logger.error(f"Unable download slide \"{Filename}\". Response code: {DownloadingStatus.code}.")

				MovingStatus = self._Parser.images_downloader.move_from_temp(WorkDirectory, Filename, f"{Index}", is_full_filename = False)
				MovingStatus.print_messages()
			
			download_time = time.time() - start_time
			images_per_second = SlidesCount / download_time if download_time > 0 else 0
			
			# СИНИЙ ЛОГ: Информация о скачанной главе с метриками (последовательный метод)
			self._SystemObjects.logger.info(f"\033[94m📥 {chapter_display} - {SlidesCount} images ({images_per_second:.1f} img/sec, sequential)\033[0m")
		
		# ИСПРАВЛЕНИЕ: Вызываем систему сборки ТОЛЬКО ОДИН РАЗ после скачивания всех изображений
		self.__BuildSystemsMethods[self._BuildSystem](title, TargetChapter, WorkDirectory)

		shutil.rmtree(WorkDirectory)

	def build_branch(self, title: "Manga", branch_id: int | None = None):
		"""
		Строит ветвь контента манги.
			branch_id – ID выбранной ветви (по умолчанию самая длинная).
		"""

		TargetBranch: "Branch" = self._SelectBranch(title.branches, branch_id)
		
		# Проверка на случай отсутствия веток/глав (например, для 18+ контента без авторизации)
		if TargetBranch is None:
			self._SystemObjects.logger.warning("No branches found in title. Title may have no chapters (e.g. 18+ content without authentication).")
			return
		
		if not TargetBranch.chapters:
			self._SystemObjects.logger.warning(f"Branch {TargetBranch.id} has no chapters. Skipping build.")
			return
		
		# Подсчет общего количества изображений в тайтле
		total_images = sum(len(ch.slides) for ch in TargetBranch.chapters)
		
		# СИНИЙ ЛОГ: Переход к билдингу с общим количеством изображений  
		self._SystemObjects.logger.info(f"\033[94m🔨 Starting build: {len(TargetBranch.chapters)} chapters, {total_images} images total\033[0m")
		
		# Проверка на дубликаты в списке глав
		chapter_ids = [ch.id for ch in TargetBranch.chapters]
		if len(chapter_ids) != len(set(chapter_ids)):
			duplicates = [ch_id for ch_id in set(chapter_ids) if chapter_ids.count(ch_id) > 1]
			self._SystemObjects.logger.warning(f"Found duplicate chapter IDs in branch: {duplicates}")
		
		# Счетчик скачанных изображений
		downloaded_images = 0
		
		for CurrentChapter in TargetBranch.chapters: 
			self.build_chapter(title, CurrentChapter.id)
			downloaded_images += len(CurrentChapter.slides)
			
			# СИНИЙ ЛОГ: Прогресс скачанных изображений
			self._SystemObjects.logger.info(f"\033[94m📊 Downloaded: {downloaded_images}/{total_images} images ({downloaded_images/total_images*100:.1f}%)\033[0m")
		
		# СИНИЙ ЛОГ: Завершение билдинга и переход к импорту
		self._SystemObjects.logger.info(f"\033[94m✅ Build completed → Starting import phase\033[0m")

	def select_build_system(self, build_system: str | None):
		"""
		Задаёт систему сборки контента.
			build_system – название системы сборки.
		"""

		self._BuildSystem = MangaBuildSystems(build_system) if build_system else None