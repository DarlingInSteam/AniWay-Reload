import { useState, useEffect } from 'react'
import { Bookmark, BookmarkStatus } from '../types'
import { bookmarkService } from '../services/bookmarkService'
import { useAuth } from '../contexts/AuthContext'

export const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated } = useAuth()

  const fetchBookmarks = async () => {
    if (!isAuthenticated) {
      setBookmarks([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await bookmarkService.getUserBookmarks()
      setBookmarks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bookmarks')
      setBookmarks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBookmarks()
  }, [isAuthenticated])

  const addBookmark = async (mangaId: number, status: BookmarkStatus, isFavorite = false) => {
    try {
      const newBookmark = await bookmarkService.createOrUpdateBookmark({
        mangaId,
        status,
        isFavorite
      })
      
      // Обновляем локальное состояние
      setBookmarks(prev => {
        const existing = prev.find(b => b.mangaId === mangaId)
        if (existing) {
          return prev.map(b => b.mangaId === mangaId ? newBookmark : b)
        } else {
          return [...prev, newBookmark]
        }
      })
      
      return newBookmark
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to add bookmark')
    }
  }

  const removeBookmark = async (mangaId: number) => {
    try {
      await bookmarkService.deleteBookmark(mangaId)
      setBookmarks(prev => prev.filter(b => b.mangaId !== mangaId))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to remove bookmark')
    }
  }

  const toggleFavorite = async (mangaId: number) => {
    try {
      const updatedBookmark = await bookmarkService.toggleFavorite(mangaId)
      setBookmarks(prev => {
        const existing = prev.find(b => b.mangaId === mangaId)
        if (existing) {
          return prev.map(b => b.mangaId === mangaId ? updatedBookmark : b)
        } else {
          return [...prev, updatedBookmark]
        }
      })
      return updatedBookmark
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to toggle favorite')
    }
  }

  const changeStatus = async (mangaId: number, status: BookmarkStatus) => {
    try {
      const updatedBookmark = await bookmarkService.changeReadingStatus(mangaId, status)
      setBookmarks(prev => {
        const existing = prev.find(b => b.mangaId === mangaId)
        if (existing) {
          return prev.map(b => b.mangaId === mangaId ? updatedBookmark : b)
        } else {
          return [...prev, updatedBookmark]
        }
      })
      return updatedBookmark
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to change status')
    }
  }

  const getMangaBookmark = (mangaId: number): Bookmark | undefined => {
    return bookmarks.find(b => b.mangaId === mangaId)
  }

  const getBookmarksByStatus = (status: BookmarkStatus): Bookmark[] => {
    return bookmarks.filter(b => b.status === status)
  }

  const getFavorites = (): Bookmark[] => {
    return bookmarks.filter(b => b.isFavorite)
  }

  return {
    bookmarks,
    loading,
    error,
    addBookmark,
    removeBookmark,
    toggleFavorite,
    changeStatus,
    getMangaBookmark,
    getBookmarksByStatus,
    getFavorites,
    refetch: fetchBookmarks
  }
}

export const useBookmarkStats = () => {
  const [stats, setStats] = useState<Record<BookmarkStatus, number> & { favorites: number }>({
    READING: 0,
    PLAN_TO_READ: 0,
    COMPLETED: 0,
    ON_HOLD: 0,
    DROPPED: 0,
    favorites: 0
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
        const data = await bookmarkService.getBookmarkStats()
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch bookmark stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [isAuthenticated])

  return { stats, loading }
}
