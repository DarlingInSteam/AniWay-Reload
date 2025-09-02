import { useState, useEffect, useRef } from 'react'
import { ReadingProgress, ReadingStats } from '../types'
import { progressService } from '../services/progressService'
import { useAuth } from '../contexts/AuthContext'

export const useReadingProgress = () => {
  const [progress, setProgress] = useState<ReadingProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated } = useAuth()
  
  // Для предотвращения повторных вызовов trackChapterViewed
  const trackedChapters = useRef<Set<number>>(new Set())

  const fetchProgress = async () => {
    if (!isAuthenticated) {
      setProgress([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await progressService.getUserProgress()
      setProgress(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch progress')
      setProgress([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProgress()
  }, [isAuthenticated])

  const saveProgress = async (mangaId: number, chapterId: number, page: number, totalPages: number) => {
    try {
      const newProgress = await progressService.saveProgress({
        mangaId,
        chapterId,
        page,
        totalPages
      })
      
      // Обновляем локальное состояние
      setProgress(prev => {
        const existing = prev.find(p => p.chapterId === chapterId)
        if (existing) {
          return prev.map(p => p.chapterId === chapterId ? newProgress : p)
        } else {
          return [...prev, newProgress]
        }
      })
      
      return newProgress
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to save progress')
    }
  }

  const markChapterAsRead = async (mangaId: number, chapterId: number, totalPages: number) => {
    return saveProgress(mangaId, chapterId, totalPages, totalPages)
  }

  // Простое отслеживание главы (при открытии) с автоматическим завершением предыдущей главы
  const trackChapterViewed = async (
    mangaId: number, 
    chapterId: number, 
    chapterNumber: number,
    previousChapter?: { id: number; chapterNumber: number } // Добавляем информацию о предыдущей главе
  ) => {
    try {
      // Проверяем, не отслеживали ли мы уже эту главу
      if (trackedChapters.current.has(chapterId)) {
        console.log(`Chapter ${chapterId} already tracked, skipping`)
        return
      }
      
      // Помечаем главу как отслеженную
      trackedChapters.current.add(chapterId)
      
      // Если есть предыдущая глава, отмечаем ее как завершенную
      if (previousChapter) {
        console.log('Auto-completing previous chapter:', previousChapter)
        try {
          await progressService.markChapterAsCompleted(mangaId, previousChapter.id, previousChapter.chapterNumber)
          console.log('Previous chapter marked as completed successfully')
          
          // Обновляем локальное состояние для предыдущей главы
          setProgress(prev => {
            return prev.map(p => 
              p.chapterId === previousChapter.id 
                ? { ...p, isCompleted: true, updatedAt: new Date().toISOString() }
                : p
            )
          })
        } catch (error) {
          console.error('Failed to mark previous chapter as completed:', error)
          // Продолжаем выполнение даже если не удалось завершить предыдущую главу
        }
      }

      // Отслеживаем текущую главу
      const newProgress = await progressService.trackChapterViewed(mangaId, chapterId, chapterNumber)
      
      // Обновляем локальное состояние для текущей главы
      setProgress(prev => {
        const existing = prev.find(p => p.chapterId === chapterId)
        if (existing) {
          return prev.map(p => p.chapterId === chapterId ? newProgress : p)
        } else {
          return [...prev, newProgress]
        }
      })
      
      return newProgress
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to track chapter')
    }
  }

  // Пометить главу как завершенную
  const markChapterCompleted = async (mangaId: number, chapterId: number, chapterNumber: number) => {
    try {
      const newProgress = await progressService.markChapterAsCompleted(mangaId, chapterId, chapterNumber)
      
      // Обновляем локальное состояние
      setProgress(prev => {
        const existing = prev.find(p => p.chapterId === chapterId)
        if (existing) {
          return prev.map(p => p.chapterId === chapterId ? newProgress : p)
        } else {
          return [...prev, newProgress]
        }
      })
      
      return newProgress
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to mark chapter as completed')
    }
  }

  // Проверить, прочитана ли глава
  const isChapterCompleted = (chapterId: number): boolean => {
    const chapterProgress = progress.find(p => p.chapterId === chapterId)
    return chapterProgress ? chapterProgress.isCompleted : false
  }

  // Проверить, просматривалась ли глава
  const isChapterViewed = (chapterId: number): boolean => {
    const chapterProgress = progress.find(p => p.chapterId === chapterId)
    return chapterProgress !== undefined
  }

  const deleteProgress = async (chapterId: number) => {
    try {
      await progressService.deleteProgress(chapterId)
      setProgress(prev => prev.filter(p => p.chapterId !== chapterId))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete progress')
    }
  }

  const getMangaProgress = (mangaId: number): ReadingProgress[] => {
    return progress.filter(p => p.mangaId === mangaId)
  }

  const getChapterProgress = (chapterId: number): ReadingProgress | undefined => {
    return progress.find(p => p.chapterId === chapterId)
  }

  const getLastReadChapter = (mangaId: number): ReadingProgress | undefined => {
    const mangaProgress = getMangaProgress(mangaId)
    if (mangaProgress.length === 0) return undefined

    // Сортируем по дате обновления (updatedAt) и возвращаем последний
    return mangaProgress.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )[0]
  }

  const getMangaReadingPercentage = (mangaId: number, totalChapters: number): number => {
    const mangaProgress = getMangaProgress(mangaId)
    const readChapters = mangaProgress.filter(p => p.isCompleted).length
    
    if (totalChapters === 0) return 0
    
    const percentage = Math.round((readChapters / totalChapters) * 100)
    
    // Если прочитано все главы или больше (на случай багов), показываем 100%
    return Math.min(percentage, 100)
  }

  const getRecentlyRead = (limit: number = 10): ReadingProgress[] => {
    return [...progress]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit)
  }

  // Функция для очистки кэша отслеженных глав (вызывать при смене манги)
  const clearTrackedChapters = () => {
    trackedChapters.current.clear()
  }

  return {
    progress,
    loading,
    error,
    saveProgress,
    markChapterAsRead,
    trackChapterViewed,
    markChapterCompleted,
    isChapterCompleted,
    isChapterViewed,
    deleteProgress,
    getMangaProgress,
    getChapterProgress,
    getLastReadChapter,
    getMangaReadingPercentage,
    getRecentlyRead,
    clearTrackedChapters,
    refetch: fetchProgress
  }
}

export const useReadingStats = () => {
  const [stats, setStats] = useState<ReadingStats>({
    totalMangaRead: 0,
    totalChaptersRead: 0,
    totalPagesRead: 0,
    favoriteGenres: [],
    readingStreak: 0
  })
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    const fetchStats = async () => {
      if (!isAuthenticated) {
        setLoading(false)
        return
      }

      try {
        const data = await progressService.getReadingStats()
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch reading stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [isAuthenticated])

  return { stats, loading }
}

export const useMangaProgress = (mangaId: number) => {
  const [mangaProgress, setMangaProgress] = useState<ReadingProgress[]>([])
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    const fetchMangaProgress = async () => {
      if (!isAuthenticated || !mangaId) {
        setMangaProgress([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await progressService.getMangaProgress(mangaId)
        setMangaProgress(data)
      } catch (err) {
        console.error('Failed to fetch manga progress:', err)
        setMangaProgress([])
      } finally {
        setLoading(false)
      }
    }

    fetchMangaProgress()
  }, [mangaId, isAuthenticated])

  return { mangaProgress, loading }
}

export const useChapterProgress = (chapterId: number) => {
  const [chapterProgress, setChapterProgress] = useState<ReadingProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    const fetchChapterProgress = async () => {
      if (!isAuthenticated || !chapterId) {
        setChapterProgress(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await progressService.getChapterProgress(chapterId)
        setChapterProgress(data)
      } catch (err) {
        console.error('Failed to fetch chapter progress:', err)
        setChapterProgress(null)
      } finally {
        setLoading(false)
      }
    }

    fetchChapterProgress()
  }, [chapterId, isAuthenticated])

  return { chapterProgress, loading }
}
