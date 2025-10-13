import { useState, useEffect, useMemo } from 'react'
import { Bookmark, BookmarkStatus } from '../types'
import { bookmarkService } from '../services/bookmarkService'
import { useAuth } from '../contexts/AuthContext'

export const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]) // view subset (optional)
  const [allBookmarks, setAllBookmarks] = useState<Bookmark[]>([]) // canonical full list
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
      setAllBookmarks(data)
      setBookmarks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bookmarks')
      setBookmarks([])
    } finally {
      setLoading(false)
    }
  }

  /**
   * Client-side filtering & sorting utility.
   * Accepts full dataset and derives a view list based on provided params.
   */
  const clientFilterAndSort = (params: {
    query?: string
    status?: BookmarkStatus | 'ALL' | 'FAVORITES'
    sortBy?: 'bookmark_updated' | 'manga_updated' | 'chapters_count' | 'alphabetical'
    sortOrder?: 'asc' | 'desc'
  }): Bookmark[] => {
    const { query, status, sortBy = 'bookmark_updated', sortOrder = 'desc' } = params
    const q = (query || '').trim().toLowerCase()
    let list = [...allBookmarks]
    // status / favorites filter
    if (status && status !== 'ALL') {
      if (status === 'FAVORITES') list = list.filter(b => b.isFavorite)
      else list = list.filter(b => b.status === status)
    }
    // text search (title only for now)
    if (q) {
      list = list.filter(b => (b.mangaTitle || '').toLowerCase().includes(q))
    }
    // sorting
    const dir = sortOrder === 'asc' ? 1 : -1
    list.sort((a, b) => {
      const safe = <T,>(v: T | undefined | null) => v
      switch (sortBy) {
        case 'alphabetical': {
          const at = (a.mangaTitle || '').toLowerCase()
          const bt = (b.mangaTitle || '').toLowerCase()
          return at.localeCompare(bt) * dir
        }
        case 'chapters_count': {
          const av = a.totalChapters ?? -1
            const bv = b.totalChapters ?? -1
            return (av - bv) * dir
        }
        case 'manga_updated': {
          const av = a.mangaUpdatedAt ? Date.parse(a.mangaUpdatedAt as unknown as string) : 0
          const bv = b.mangaUpdatedAt ? Date.parse(b.mangaUpdatedAt as unknown as string) : 0
          return (av - bv) * dir
        }
        case 'bookmark_updated':
        default: {
          const av = Date.parse(a.updatedAt)
          const bv = Date.parse(b.updatedAt)
          return (av - bv) * dir
        }
      }
    })
    return list
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
      setAllBookmarks(prev => {
        const existing = prev.find(b => b.mangaId === mangaId)
        if (existing) {
          return prev.map(b => b.mangaId === mangaId ? newBookmark : b)
        } else {
          return [...prev, newBookmark]
        }
      })
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
      setAllBookmarks(prev => prev.filter(b => b.mangaId !== mangaId))
      setBookmarks(prev => prev.filter(b => b.mangaId !== mangaId))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to remove bookmark')
    }
  }

  const toggleFavorite = async (mangaId: number) => {
    try {
      const updatedBookmark = await bookmarkService.toggleFavorite(mangaId)
      
      // Обновляем оба состояния
      setAllBookmarks(prev => {
        const existing = prev.find(b => b.mangaId === mangaId)
        if (existing) {
          return prev.map(b => b.mangaId === mangaId ? updatedBookmark : b)
        } else {
          return [...prev, updatedBookmark]
        }
      })
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
      setAllBookmarks(prev => {
        const existing = prev.find(b => b.mangaId === mangaId)
        if (existing) {
          return prev.map(b => b.mangaId === mangaId ? updatedBookmark : b)
        } else {
          return [...prev, updatedBookmark]
        }
      })
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
    return allBookmarks.find(b => b.mangaId === mangaId)
  }

  const getBookmarksByStatus = (status: BookmarkStatus): Bookmark[] => {
    return allBookmarks.filter(b => b.status === status)
  }

  const getFavorites = (): Bookmark[] => {
    return allBookmarks.filter(b => b.isFavorite)
  }

  return {
    bookmarks,
      allBookmarks,
    loading,
    error,
    addBookmark,
    removeBookmark,
    toggleFavorite,
    changeStatus,
    getMangaBookmark,
    getBookmarksByStatus,
    getFavorites,
    refetch: fetchBookmarks,
    serverSearch: async () => {}, // deprecated placeholder to avoid runtime errors
    clientFilterAndSort
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
