from Source.Core.Base.Parsers.Components.ImagesDownloader import ImagesDownloader

from typing import TYPE_CHECKING

if TYPE_CHECKING:
	from Source.Core.Base.Formats.BaseFormat import BaseBranch, BaseChapter
	from Source.Core.Base.Parsers.BaseParser import BaseParser
	from Source.Core.SystemObjects import SystemObjects

#==========================================================================================#
# >>>>> БАЗОВЫЙ СБОРЩИК <<<<< #
#==========================================================================================#

class BaseBuilder:
	"""Базовый сборщик."""

	#==========================================================================================#
	# >>>>> НАСЛЕДУЕМЫЕ МЕТОДЫ <<<<< #
	#==========================================================================================#

	def _FindChapter(self, branches: list["BaseBranch"], chapter_id: int) -> "BaseChapter | None":
		"""
		Находит главу по её ID.
			branches – список ветвей в тайтле;\n
			chapter_id – ID искомой главы.
		"""

		if not branches: return None

		for CurrentBranch in branches:
			for CurrentChapter in CurrentBranch.chapters:
				if CurrentChapter.id == chapter_id: return CurrentChapter

	def _GenerateChapterNameByTemplate(self, chapter: "BaseChapter") -> str:
		"""
		Генерирует название главы по шаблону.
			chapter – данные главы.
		"""

		Name = self._ChapterNameTemplate
		Name = Name.replace("{number}", str(chapter.number))
		if chapter.name: Name = Name.replace("{name}", chapter.name)
		else: Name = Name.replace("{name}", "")
		Name = Name.strip()
		Name = Name.rstrip(".")

		return Name
	
	def _GenerateVolumeNameByTemplate(self, chapter: "BaseChapter") -> str:
		"""
		Генерирует название тома, к которому принадлежит глава, по шаблону.
			chapter – данные главы.
		"""

		Name = self._VolumeNameTemplate
		Name = Name.replace("{number}", str(chapter.volume))
		Name = Name.strip()
		Name = Name.rstrip(".")

		return Name

	def _SelectBranch(self, branches: list["BaseBranch"], branch_id: int | None = None) -> "BaseBranch | None":
		"""
		Выбирает ветвь для построения.
			branches – список ветвей в тайтле;\n
			branch_id – ID искомой ветви.
		"""

		if not branches: return None
		
		# Если указан конкретный branch_id, ищем его
		if branch_id:
			for CurrentBranch in branches:
				if CurrentBranch.id == branch_id: return CurrentBranch
		
		# Если branch_id не указан, выбираем самую длинную ветку (с максимальным количеством глав)
		longest_branch = branches[0]
		max_chapters = len(branches[0].chapters) if branches[0].chapters else 0
		
		for CurrentBranch in branches:
			chapter_count = len(CurrentBranch.chapters) if CurrentBranch.chapters else 0
			
			if chapter_count > max_chapters:
				max_chapters = chapter_count
				longest_branch = CurrentBranch
		
		# Выводим информацию о выборе ветки только если есть несколько веток  
		if len(branches) > 1:
			self._SystemObjects.logger.info(f"📋 Selected branch {longest_branch.id} with {max_chapters} chapters")
		return longest_branch

	#==========================================================================================#
	# >>>>> ПЕРЕОПРЕДЕЛЯЕМЫЕ МЕТОДЫ <<<<< #
	#==========================================================================================#

	def _PostInitMethod(self):
		"""Метод, выполняющийся после инициализации объекта."""

		pass

	#==========================================================================================#
	# >>>>> ПУБЛИЧНЫЕ МЕТОДЫ <<<<< #
	#==========================================================================================#

	def __init__(self, system_objects: "SystemObjects", parser: "BaseParser"):
		"""
		Базовый сборщик.

		:param system_objects: Коллекция системных объектов.
		:type system_objects: SystemObjects
		:param parser: Парсер.
		:type parser: BaseParser
		"""

		self._SystemObjects = system_objects
		self._Parser = parser

		self._ParserSettings = self._Parser.settings
		self._Temper = self._SystemObjects.temper
		self._Logger = self._SystemObjects.logger

		self._BuildSystem = None
		self._SortingByVolumes = False

		self._ChapterNameTemplate: str = "{number}. {name}"
		self._VolumeNameTemplate: str = "{number}. {name}"

		self._PostInitMethod()

	def enable_sorting_by_volumes(self, status: bool):
		"""
		Переключает сортировку глав по директориям томов.
			status – статус сортировки.
		"""

		self._SortingByVolumes = status

	def select_build_system(self, build_system: str | None):
		"""
		Задаёт систему сборки контента.
			build_system – название системы сборки.
		"""

		self._BuildSystem = build_system or None

	def set_chapter_name_template(self, template: str):
		"""
		Задаёт шаблон именования глав.
			template – шаблон.
		"""

		self._ChapterNameTemplate = template

	def set_volume_name_template(self, template: str):
		"""
		Задаёт шаблон именования томов.
			template – шаблон.
		"""

		self._VolumeNameTemplate = template