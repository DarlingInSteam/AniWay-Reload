import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ReadingProgress, ReadingStats } from '../types'
import { progressService } from '../services/progressService'
import { useAuth } from '../contexts/AuthContext'

interface ReadingProgressContextValue {
  progress: ReadingProgress[]
  loading: boolean
  error: string | null
  saveProgress: (mangaId: number, chapterId: number, page: number, totalPages: number) => Promise<ReadingProgress>
  markChapterAsRead: (mangaId: number, chapterId: number, totalPages: number) => Promise<ReadingProgress>
  trackChapterViewed: (
    mangaId: number,
    chapterId: number,
    chapterNumber: number,
    previousChapter?: { id: number; chapterNumber: number }
  ) => Promise<ReadingProgress | undefined>
  markChapterCompleted: (mangaId: number, chapterId: number, chapterNumber: number) => Promise<ReadingProgress>
  isChapterCompleted: (chapterId: number) => boolean
  isChapterViewed: (chapterId: number) => boolean
  deleteProgress: (chapterId: number) => Promise<void>
  getMangaProgress: (mangaId: number) => ReadingProgress[]
  getChapterProgress: (chapterId: number) => ReadingProgress | undefined
  getLastReadChapter: (mangaId: number) => ReadingProgress | undefined
  getMangaReadingPercentage: (mangaId: number, totalChapters: number) => number
  getRecentlyRead: (limit?: number) => ReadingProgress[]
  clearTrackedChapters: () => void
  refetch: () => Promise<void>
}

const ReadingProgressContext = createContext<ReadingProgressContextValue | undefined>(undefined)

const useReadingProgressState = (): ReadingProgressContextValue => {
  const [progress, setProgress] = useState<ReadingProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated } = useAuth()
  
  // Для предотвращения повторных вызовов trackChapterViewed
  const trackedChapters = useRef<Set<number>>(new Set())

  const fetchProgress = useCallback(async () => {
    if (!isAuthenticated) {
      setProgress([])
      setError(null)
      setLoading(false)
      trackedChapters.current.clear()
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await progressService.getUserProgress()
      setProgress(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch progress')
      setProgress([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    fetchProgress().catch(error => console.error('Failed to fetch progress', error))
  }, [fetchProgress])

  const saveProgress = useCallback(async (mangaId: number, chapterId: number, page: number, totalPages: number) => {
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
  }, [])

  const markChapterAsRead = useCallback((mangaId: number, chapterId: number, totalPages: number) => {
    return saveProgress(mangaId, chapterId, totalPages, totalPages)
  }, [saveProgress])

  // Простое отслеживание главы (при открытии) с автоматическим завершением предыдущей главы
  const trackChapterViewed = useCallback(async (
    mangaId: number,
    chapterId: number,
    chapterNumber: number,
    previousChapter?: { id: number; chapterNumber: number }
  ) => {
    try {
      // Проверяем, не отслеживали ли мы уже эту главу
      if (trackedChapters.current.has(chapterId)) {
        return undefined
      }
      
      // Помечаем главу как отслеженную
      trackedChapters.current.add(chapterId)
      
      // Если есть предыдущая глава, отмечаем ее как завершенную
      if (previousChapter) {
        try {
          await progressService.markChapterAsCompleted(mangaId, previousChapter.id, previousChapter.chapterNumber)
          
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
  }, [])

  // Пометить главу как завершенную
  const markChapterCompleted = useCallback(async (mangaId: number, chapterId: number, chapterNumber: number) => {
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
  }, [])

  // Проверить, прочитана ли глава
  const isChapterCompleted = useCallback((chapterId: number): boolean => {
    const chapterProgress = progress.find(p => p.chapterId === chapterId)
    return chapterProgress ? chapterProgress.isCompleted : false
  }, [progress])

  // Проверить, просматривалась ли глава
  const isChapterViewed = useCallback((chapterId: number): boolean => {
    return progress.some(p => p.chapterId === chapterId)
  }, [progress])

  const deleteProgress = useCallback(async (chapterId: number) => {
    try {
      await progressService.deleteProgress(chapterId)
      setProgress(prev => prev.filter(p => p.chapterId !== chapterId))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete progress')
    }
  }, [])

  const getMangaProgress = useCallback((mangaId: number): ReadingProgress[] => {
    if (!Array.isArray(progress)) return []
    return progress.filter(p => p.mangaId === mangaId)
  }, [progress])

  const getChapterProgress = useCallback((chapterId: number): ReadingProgress | undefined => {
    return progress.find(p => p.chapterId === chapterId)
  }, [progress])

  const getLastReadChapter = useCallback((mangaId: number): ReadingProgress | undefined => {
    const mangaProgress = getMangaProgress(mangaId)
    if (!mangaProgress || !Array.isArray(mangaProgress) || mangaProgress.length === 0) return undefined

    const safeTimestamp = (value?: string) => {
      if (!value) return 0
      const time = new Date(value).getTime()
      return Number.isFinite(time) ? time : 0
    }

    const sorted = [...mangaProgress].sort((a, b) => {
      const diff = safeTimestamp(b.updatedAt) - safeTimestamp(a.updatedAt)
      if (diff !== 0) return diff
      return (b.chapterNumber ?? 0) - (a.chapterNumber ?? 0)
    })

    const activeProgress = sorted.find(progress => !progress.isCompleted)
    return activeProgress ?? sorted[0]
  }, [getMangaProgress])

  const getMangaReadingPercentage = useCallback((mangaId: number, totalChapters: number): number => {
    const mangaProgress = getMangaProgress(mangaId)
    if (!mangaProgress || !Array.isArray(mangaProgress)) return 0
    
    const readChapters = mangaProgress.filter(p => p.isCompleted).length
    
    if (totalChapters === 0) return 0
    
    const percentage = Math.round((readChapters / totalChapters) * 100)
    
    // Если прочитано все главы или больше (на случай багов), показываем 100%
    return Math.min(percentage, 100)
  }, [getMangaProgress])

  const getRecentlyRead = useCallback((limit: number = 10): ReadingProgress[] => {
    return [...progress]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit)
  }, [progress])

  // Функция для очистки кэша отслеженных глав (вызывать при смене манги)
  const clearTrackedChapters = useCallback(() => {
    trackedChapters.current.clear()
  }, [])

  return useMemo<ReadingProgressContextValue>(() => ({
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
  }), [
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
    fetchProgress
  ])
}

export const ReadingProgressProvider = ({ children }: { children: ReactNode }) => {
  const value = useReadingProgressState()
  return createElement(ReadingProgressContext.Provider, { value }, children)
}

export const useReadingProgress = (): ReadingProgressContextValue => {
  const context = useContext(ReadingProgressContext)
  if (!context) {
    throw new Error('useReadingProgress must be used within a ReadingProgressProvider')
  }
  return context
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

    fetchStats().catch(err => console.error('Failed to fetch reading stats', err))
  }, [isAuthenticated])

  return { stats, loading }
}

export const useMangaProgress = (mangaId: number) => {
  const { getMangaProgress, loading } = useReadingProgress()
  const mangaProgress = useMemo(() => getMangaProgress(mangaId), [getMangaProgress, mangaId])
  return { mangaProgress, loading }
}

export const useChapterProgress = (chapterId: number) => {
  const { getChapterProgress, loading } = useReadingProgress()
  const chapterProgress = useMemo(() => getChapterProgress(chapterId) ?? null, [getChapterProgress, chapterId])
  return { chapterProgress, loading }
}
