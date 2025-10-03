import { ChapterDTO } from '@/types'

/**
 * Извлекает реальный номер главы из формата 1XXX
 */
export function getDisplayChapterNumber(chapterNumber: number): number {
  // Если номер больше или равен 1000, то это формат 1XXX - извлекаем последние 3 цифры
  if (chapterNumber >= 1000) {
    return chapterNumber % 1000
  }
  return chapterNumber
}

/**
 * Форматирует отображение номера главы с учетом тома
 */
export function formatChapterTitle(chapter: ChapterDTO): string {
  // Если есть кастомное название, используем его
  if (chapter.title && chapter.title.trim() && !chapter.title.startsWith('Глава')) {
    return chapter.title
  }

  // Если есть том и оригинальный номер главы, используем их
  if (chapter.volumeNumber && chapter.originalChapterNumber) {
    return `Том ${chapter.volumeNumber}, Глава ${chapter.originalChapterNumber}`
  }

  // Если есть только оригинальный номер, используем его
  if (chapter.originalChapterNumber) {
    return `Глава ${chapter.originalChapterNumber}`
  }

  // Fallback - используем chapterNumber, но пытаемся извлечь оригинальный номер
  if (chapter.chapterNumber >= 1000) {
    const originalNumber = chapter.chapterNumber % 1000
    const volume = Math.floor(chapter.chapterNumber / 1000)
    return `Том ${volume}, Глава ${originalNumber}`
  }

  return `Глава ${chapter.chapterNumber}`
}

/**
 * Форматирует короткое отображение номера главы для списков
 */
export function formatChapterNumber(chapter: ChapterDTO): string {
  if (chapter.originalChapterNumber) {
    return chapter.originalChapterNumber.toString()
  }
  
  // Fallback - извлекаем оригинальный номер из расчетного
  if (chapter.chapterNumber >= 1000) {
    const originalNumber = chapter.chapterNumber % 1000
    return originalNumber.toString()
  }
  
  return chapter.chapterNumber.toString()
}

/**
 * Форматирует отображение тома
 */
export function formatVolumeNumber(chapter: ChapterDTO): string | null {
  if (chapter.volumeNumber) {
    return `Том ${chapter.volumeNumber}`
  }
  return null
}

/**
 * Возвращает различные варианты заголовка главы для адаптивного отображения
 */
export function buildChapterTitleVariants(chapter: ChapterDTO) {
  const full = formatChapterTitle(chapter)

  // Если это кастомное название (не начинается с "Глава"), то для сокращений просто обрезаем
  const isCustom = chapter.title && chapter.title.trim() && !chapter.title.startsWith('Глава')
  const chapterNum = chapter.originalChapterNumber || getDisplayChapterNumber(chapter.chapterNumber)
  let volume: number | undefined
  if (chapter.volumeNumber) volume = chapter.volumeNumber
  else if (chapter.chapterNumber >= 1000) volume = Math.floor(chapter.chapterNumber / 1000)

  if (isCustom) {
    const trimmed = chapter.title!.trim()
    return {
      full,
      medium: trimmed.length > 38 ? trimmed.slice(0, 38) + '…' : trimmed,
      short: trimmed.length > 26 ? trimmed.slice(0, 26) + '…' : trimmed,
      minimal: trimmed.length > 14 ? trimmed.slice(0, 14) + '…' : trimmed
    }
  }

  // Стандартные варианты
  const medium = volume ? `Том ${volume} • Гл ${chapterNum}` : `Глава ${chapterNum}`
  const short = volume ? `T${volume} Г${chapterNum}` : `Гл ${chapterNum}`
  const minimal = volume ? `${volume}:${chapterNum}` : `${chapterNum}`

  return { full, medium, short, minimal }
}

/**
 * Выбирает наилучший вариант заголовка исходя из доступной ширины.
 * Очень простая эвристика: по брейкпоинтам ширины окна и длине полного заголовка
 */
export function getAdaptiveChapterTitle(chapter: ChapterDTO, viewportWidth: number): string {
  const variants = buildChapterTitleVariants(chapter)
  const fullLen = variants.full.length

  // Узкие экраны телефонов
  if (viewportWidth < 340) {
    return variants.minimal
  }
  if (viewportWidth < 390) {
    return fullLen > 22 ? variants.short : variants.full
  }
  if (viewportWidth < 460) {
    if (fullLen > 32) return variants.medium
    return variants.full
  }
  if (viewportWidth < 560) {
    if (fullLen > 40) return variants.medium
    return variants.full
  }
  // Десктоп — всегда полный
  return variants.full
}
