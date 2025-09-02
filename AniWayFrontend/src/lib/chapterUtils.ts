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
