import { ReadingProgress, ReadingProgressRequest, ReadingStats } from '../types'
import { authService } from './authService'

const baseUrl = '/api/auth'

// Получить заголовки для аутентифицированных запросов
const getAuthHeaders = (): HeadersInit => {
  const token = authService.getToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

// Получить весь прогресс чтения пользователя
export const getUserProgress = async (): Promise<ReadingProgress[]> => {
  const response = await fetch(`${baseUrl}/progress`, {
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error('Failed to fetch reading progress')
  }

  return response.json()
}

// Получить прогресс для конкретной манги
export const getMangaProgress = async (mangaId: number): Promise<ReadingProgress[]> => {
  const response = await fetch(`${baseUrl}/progress/manga/${mangaId}`, {
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error('Failed to fetch manga progress')
  }

  return response.json()
}

// Получить прогресс для конкретной главы
export const getChapterProgress = async (chapterId: number): Promise<ReadingProgress | null> => {
  const response = await fetch(`${baseUrl}/progress/chapter/${chapterId}`, {
    headers: getAuthHeaders()
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error('Failed to fetch chapter progress')
  }

  return response.json()
}

// Сохранить прогресс чтения
export const saveProgress = async (progressData: any): Promise<ReadingProgress> => {
  const response = await fetch(`${baseUrl}/progress`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(progressData)
  })

  if (!response.ok) {
    throw new Error('Failed to save reading progress')
  }

  return response.json()
}

// Отметить главу как просмотренную (простая система: pageNumber = 1, isCompleted = false)
export const trackChapterViewed = async (mangaId: number, chapterId: number, chapterNumber: number): Promise<ReadingProgress> => {
  const progressData = {
    mangaId,
    chapterId,
    chapterNumber,
    pageNumber: 1,
    isCompleted: false
  }

  return saveProgress(progressData)
}

// Отметить главу как завершенную (простая система: isCompleted = true)
export const markChapterAsCompleted = async (mangaId: number, chapterId: number, chapterNumber: number): Promise<ReadingProgress> => {
  console.log('progressService.markChapterAsCompleted called:', {
    mangaId,
    chapterId,
    chapterNumber
  })
  
  const progressData = {
    mangaId,
    chapterId,
    chapterNumber,
    pageNumber: 1,
    isCompleted: true
  }

  console.log('Sending progress data:', progressData)
  const result = await saveProgress(progressData)
  console.log('markChapterAsCompleted result:', result)
  return result
}

// Удалить прогресс чтения для главы
export const deleteProgress = async (chapterId: number): Promise<void> => {
  const response = await fetch(`${baseUrl}/progress/chapter/${chapterId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error('Failed to delete reading progress')
  }
}

// Получить статистику чтения
export const getReadingStats = async (): Promise<ReadingStats> => {
  const response = await fetch(`${baseUrl}/progress/stats`, {
    headers: getAuthHeaders()
  })

  if (!response.ok) {
    throw new Error('Failed to fetch reading stats')
  }

  return response.json()
}

// Экспорт объекта с методами для обратной совместимости
export const progressService = {
  getUserProgress,
  getMangaProgress,
  getChapterProgress,
  saveProgress,
  trackChapterViewed,
  markChapterAsCompleted,
  deleteProgress,
  getReadingStats
}
