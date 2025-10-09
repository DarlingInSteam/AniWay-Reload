from dublib.Methods.Filesystem import NormalizePath
from dublib.Engine.Bus import ExecutionStatus
from dublib.WebRequestor import WebRequestor

from typing import Optional, TYPE_CHECKING
from pathlib import Path
from os import PathLike
from urllib.parse import urlparse, unquote, quote
import shutil
import os

if TYPE_CHECKING:
	from Source.Core.SystemObjects import SystemObjects

class ImagesDownloader:
	"""Оператор загрузки изображений."""

	# Глобальный счетчик для отслеживания прогресса
	__download_counter = 0
	__total_images = 0

	#==========================================================================================#
	# >>>>> СВОЙСТВА <<<<< #
	#==========================================================================================#

	@property
	def requestor(self) -> WebRequestor:
		"""Установленный менеджер запросов."""

		return self.__Requestor
			
	#==========================================================================================#
	# >>>>> ПУБЛИЧНЫЕ МЕТОДЫ <<<<< #
	#==========================================================================================#
	
	def __init__(self, system_objects: "SystemObjects", requestor: WebRequestor):
		"""
		Оператор загрузки изображений.

		:param system_objects: Коллекция системных объектов.
		:type system_objects: SystemObjects
		:param requestor: Менеджер запросов.
		:type requestor: WebRequestor
		"""
		
		self.__SystemObjects = system_objects
		self.__Requestor = requestor

		self.__ParserSettings = self.__SystemObjects.manager.current_parser_settings

	@classmethod
	def set_total_images(cls, total: int):
		"""Устанавливает общее количество изображений для скачивания."""
		cls.__total_images = total
		cls.__download_counter = 0
		print(f"Downloading images...", flush=True)

	@classmethod
	def get_progress_info(cls) -> tuple[int, int]:
		"""Возвращает текущий прогресс скачивания (скачано, всего)."""
		return cls.__download_counter, cls.__total_images

	def is_exists(self, url: str, directory: Optional[PathLike] = None, filename: Optional[str] = None, is_full_filename: bool = True) -> bool:
		"""
		Проверяет существование изображения в целевой директории.

		:param url: Ссылка на изображение.
		:type url: str
		:param directory: Целевая директория. По умолчанию будет проверен временный каталог парсера.
		:type directory: Optional[PathLike]
		:param filename: Имя файла. По умолчанию будет сгенерировано на основе URL.
		:type filename: Optional[str]
		:param is_full_filename: Указывает, является ли имя файла полным. Если имя неполное, то расширение для файла будет сгенерировано автоматически (например, для имени *image* будет создан файл *image.jpg* на основе ссылки), в ином случае имя файла задаётся жёстко. 
		:type is_full_filename: bool
		:return: Возвращает `True`, если файл с таким именем уже существует в директории.
		:rtype: bool
		"""

		if not directory:
			directory = self.__SystemObjects.temper.parser_temp
		else:
			directory = NormalizePath(directory)

		resolved_name, resolved_suffix = self.__resolve_filename(url, filename, is_full_filename)
		return os.path.exists(f"{directory}/{resolved_name}{resolved_suffix}")

	def image(self, url: str, directory: Optional[PathLike] = None, filename: Optional[str] = None, is_full_filename: bool = False) -> ExecutionStatus:
		"""
		Скачивает изображение.

		:param url: Ссылка на изображение.
		:type url: str
		:param directory: Путь к каталогу, в который нужно сохранить файл. По умолчанию будет использован временный каталог парсера.
		:type directory: Optional[PathLike]
		:param filename: Имя файла. По умолчанию будет сгенерировано на основе URL.
		:type filename: Optional[str]
		:param is_full_filename: Указывает, является ли имя файла полным. Если имя неполное, то расширение для файла будет сгенерировано автоматически (например, для имени *image* будет создан файл *image.jpg* на основе ссылки), в ином случае имя файла задаётся жёстко. 
		:type is_full_filename: bool
		:return: Контейнер статуса выполнения. Под ключём `exists` содержится информация о том, существовал ли файл в каталоге загрузки на момент вызова метода.
		:rtype: ExecutionStatus
		"""

		Status = ExecutionStatus()
		Status["exists"] = False
		if not directory: directory = self.__SystemObjects.temper.parser_temp
		else: directory = NormalizePath(directory)

		#---> Определение параметров файла.
		#==========================================================================================#
		resolved_name, resolved_suffix = self.__resolve_filename(url, filename, is_full_filename)
		ImagePath = f"{directory}/{resolved_name}{resolved_suffix}"

		if os.path.exists(ImagePath):
			Status["exists"] = True
			Status.value = resolved_name + resolved_suffix

		#---> Определение параметров файла.
		#==========================================================================================#

		if not Status["exists"] or self.__SystemObjects.FORCE_MODE:
			Response = self.__Requestor.get(url)
			Status.code = Response.status_code

			if Response.status_code == 200:
				
				if len(Response.content) > 1000:
					with open(ImagePath, "wb") as FileWriter:
						FileWriter.write(Response.content)
					Status.value = resolved_name + resolved_suffix

					# Увеличиваем счетчик скачанных изображений
					ImagesDownloader.__download_counter += 1
					downloaded, total = ImagesDownloader.get_progress_info()
					if total > 0:
						print(f"Downloaded {downloaded}/{total} images", flush=True)
					
				elif self.__ParserSettings.common.bad_image_stub:
					shutil.copy2(self.__ParserSettings.common.bad_image_stub, ImagePath)
					self.__SystemObjects.logger.warning(f"Image doesn't contain enough bytes: \"{url}\". Replaced by stub.")

				else: self.__SystemObjects.logger.error(f"Image doesn't contain enough bytes: \"{url}\".")

			elif Response.status_code == 404: self.__SystemObjects.logger.request_error(Response, f"Image not found: \"{url}\".", exception = False)
			else: self.__SystemObjects.logger.request_error(Response, f"Unable to download image: \"{url}\".", exception = False)
			
		return Status

	def move_from_temp(self, directory: PathLike, original_filename: str, filename: Optional[str] = None, is_full_filename: bool = True) -> ExecutionStatus:
		"""
		Перемещает изображение из временного каталога парсера в друкгую директорию.

		:param directory: Целевая директория.
		:type directory: PathLike
		:param original_filename: Имя файла во временном каталоге пользователя.
		:type original_filename: str
		:param filename: Новое имя файла. По умолчанию будет использовано оригинальное.
		:type filename: Optional[str]
		:param is_full_filename: Указывает, является ли новое имя файла полным. Если имя неполное, то расширение для файла будет сгенерировано автоматически (например, для имени *image* будет создан файл *image.jpg* на основе оригинального имени), в ином случае имя файла задаётся жёстко. 
		:type is_full_filename: bool
		:return: Контейнер статуса выполнения. Под ключём `exists` содержится информация о том, существовал ли файл в целевом каталоге на момент вызова метода.
		:rtype: ExecutionStatus
		"""
		
		
		Status = ExecutionStatus()
		Status["exists"] = False
		Filetype = ""

		if filename and not is_full_filename:
			Filetype = Path(original_filename).suffix
			filename = Path(filename).stem
			
		elif not filename: filename = original_filename

		directory = NormalizePath(directory)
		parser_temp = NormalizePath(f"Temp/{self.__SystemObjects.parser_name}")
		original_filename = os.path.basename(original_filename)
		OriginalPath = f"{parser_temp}/{original_filename}"
		TargetPath = f"{directory}/{filename}{Filetype}"

		if os.path.exists(TargetPath): 
			Status.value = True
			Status["exists"] = True

		else:
			ExistingPath = OriginalPath
			if not os.path.exists(ExistingPath):
				ExistingPath = self.__find_temp_variant(parser_temp, original_filename)

			if ExistingPath and os.path.exists(ExistingPath):
				try:
					shutil.move(ExistingPath, TargetPath)
					Status.value = True
				except FileNotFoundError:
					message = f"Temp image missing during move: '{original_filename}'"
					Status.push_error(message)
					Status.value = False
					self.__SystemObjects.logger.error(message)
			else:
				message = f"Temp image not found: '{original_filename}'"
				Status.push_error(message)
				Status.value = False
				self.__SystemObjects.logger.error(message)

		return Status
	
	def temp_image(self, url: str, filename: Optional[str] = None, is_full_filename: bool = False) -> ExecutionStatus:
		"""
		Скачивает изображение во временный каталог парсера..

		:param url: Ссылка на изображение.
		:type url: str
		:param filename: Имя файла. По умолчанию будет использовано оригинальное.
		:type filename: Optional[str]
		:param is_full_filename: Указывает, является ли имя файла полным. Если имя неполное, то расширение для файла будет сгенерировано автоматически (например, для имени *image* будет создан файл *image.jpg* на основе ссылки), в ином случае имя файла задаётся жёстко. 
		:type is_full_filename: bool
		:return: Контейнер статуса выполнения.
		:rtype: ExecutionStatus
		"""

		return self.image(url, filename = filename, is_full_filename = is_full_filename)

	def __resolve_filename(self, url: str, filename: Optional[str], is_full_filename: bool) -> tuple[str, str]:
		"""Возвращает нормализованные имя и расширение для сохранения файла."""

		parsed = urlparse(url)
		decoded_path = unquote(parsed.path or "")
		path_obj = Path(decoded_path)
		suffix_from_url = path_obj.suffix

		if is_full_filename:
			if filename:
				resolved_name = Path(filename).name
			else:
				resolved_name = path_obj.name
			return resolved_name, ""

		# Имя файла без расширения
		if filename:
			resolved_name = Path(filename).stem
		else:
			resolved_name = path_obj.stem

		# Если расширение отсутствует в URL, пытаемся взять из исходного имени
		resolved_suffix = suffix_from_url or Path(filename or "").suffix
		return resolved_name, resolved_suffix or ""

	def __find_temp_variant(self, temp_directory: str, original_filename: str) -> Optional[str]:
		"""Пытается найти файл во временной директории с учётом URL-кодирования."""

		candidates = {original_filename}
		decoded = unquote(original_filename)
		if decoded:
			candidates.add(decoded)
			reencoded = quote(decoded)
			if reencoded:
				candidates.add(reencoded)

		for candidate in candidates:
			candidate_path = f"{temp_directory}/{candidate}"
			if os.path.exists(candidate_path):
				return candidate_path

		try:
			lower_original = original_filename.lower()
			for entry in os.listdir(temp_directory):
				if entry.lower() == lower_original:
					return f"{temp_directory}/{entry}"
		except FileNotFoundError:
			return None

		return None