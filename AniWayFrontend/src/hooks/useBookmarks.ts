import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Bookmark, BookmarkStatus } from '../types'
import { bookmarkService } from '../services/bookmarkService'
import { useAuth } from '../contexts/AuthContext'

const mergeBookmarksByMangaId = (existing: Bookmark[], updates: Bookmark[]): Bookmark[] => {
  if (!updates.length) {
    return existing
  }

  const index = new Map<number, number>()
  existing.forEach((bookmark, idx) => {
    index.set(bookmark.mangaId, idx)
  })

  let changed = false
  const result = existing.slice()

  updates.forEach(update => {
    const idx = index.get(update.mangaId)
    if (idx === undefined) {
      result.push(update)
      index.set(update.mangaId, result.length - 1)
      changed = true
    } else if (result[idx] !== update) {
      result[idx] = update
      changed = true
    }
  })

  return changed ? result : existing
}

type BookmarkSort = 'bookmark_updated' | 'manga_updated' | 'chapters_count' | 'alphabetical'
type BookmarkSortOrder = 'asc' | 'desc'

type ClientFilterParams = {
  query?: string
  status?: BookmarkStatus | 'ALL' | 'FAVORITES'
  sortBy?: BookmarkSort
  sortOrder?: BookmarkSortOrder
}

export interface BookmarksContextValue {
  bookmarks: Bookmark[]
  allBookmarks: Bookmark[]
  loading: boolean
  error: string | null
  addBookmark: (mangaId: number, status: BookmarkStatus, isFavorite?: boolean) => Promise<Bookmark>
  removeBookmark: (mangaId: number) => Promise<void>
  toggleFavorite: (mangaId: number) => Promise<Bookmark>
  changeStatus: (mangaId: number, status: BookmarkStatus) => Promise<Bookmark>
  getMangaBookmark: (mangaId: number) => Bookmark | undefined
  getBookmarksByStatus: (status: BookmarkStatus) => Bookmark[]
  getFavorites: () => Bookmark[]
  clientFilterAndSort: (params: ClientFilterParams) => Bookmark[]
  refetch: () => Promise<void>
  hydrateMangaBookmarks: (mangaIds: number[]) => Promise<void>
}

const BookmarksContext = createContext<BookmarksContextValue | undefined>(undefined)

export const BookmarksProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]) // view subset (optional)
  const [allBookmarks, setAllBookmarks] = useState<Bookmark[]>([]) // canonical full list
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated } = useAuth()

  const fetchBookmarks = useCallback(async () => {
    if (!isAuthenticated) {
      setBookmarks([])
      setAllBookmarks([])
      setError(null)
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
      setAllBookmarks([])
      setBookmarks([])
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  /**
   * Client-side filtering & sorting utility.
   * Accepts full dataset and derives a view list based on provided params.
   */
  const clientFilterAndSort = useCallback((params: ClientFilterParams): Bookmark[] => {
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
  }, [allBookmarks])

  const hydrateMangaBookmarks = useCallback(async (mangaIds: number[]) => {
    if (!isAuthenticated) {
      return
    }

    const uniqueIds = Array.from(
      new Set(
        (mangaIds || []).filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
      )
    )

    if (uniqueIds.length === 0) {
      return
    }

    const knownIds = new Set(allBookmarks.map(b => b.mangaId))
    const idsToFetch = uniqueIds.filter(id => !knownIds.has(id))

    if (idsToFetch.length === 0) {
      return
    }

    try {
      const batch = await bookmarkService.getBookmarksBatch(idsToFetch)
      if (!batch.length) {
        return
      }

      setAllBookmarks(prev => mergeBookmarksByMangaId(prev, batch))
      setBookmarks(prev => mergeBookmarksByMangaId(prev, batch))
    } catch (err) {
      console.error('Failed to hydrate bookmarks batch', err)
    }
  }, [allBookmarks, isAuthenticated])

  const addBookmark = useCallback(async (mangaId: number, status: BookmarkStatus, isFavorite = false) => {
    try {
      const newBookmark = await bookmarkService.createOrUpdateBookmark({
        mangaId,
        status,
        isFavorite
      })

      setAllBookmarks(prev => {
        const existing = prev.find(b => b.mangaId === mangaId)
        return existing ? prev.map(b => (b.mangaId === mangaId ? newBookmark : b)) : [...prev, newBookmark]
      })

      setBookmarks(prev => {
        const existing = prev.find(b => b.mangaId === mangaId)
        return existing ? prev.map(b => (b.mangaId === mangaId ? newBookmark : b)) : [...prev, newBookmark]
      })

      return newBookmark
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to add bookmark')
    }
  }, [])

  const removeBookmark = useCallback(async (mangaId: number) => {
    try {
      await bookmarkService.deleteBookmark(mangaId)
      setAllBookmarks(prev => prev.filter(b => b.mangaId !== mangaId))
      setBookmarks(prev => prev.filter(b => b.mangaId !== mangaId))
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to remove bookmark')
    }
  }, [])

  const toggleFavorite = useCallback(async (mangaId: number) => {
    try {
      const currentBookmark = allBookmarks.find(b => b.mangaId === mangaId)
      const payload = currentBookmark
        ? {
            mangaId,
            status: currentBookmark.status,
            isFavorite: !currentBookmark.isFavorite
          }
        : {
            mangaId,
            status: 'PLAN_TO_READ' as BookmarkStatus,
            isFavorite: true
          }

      const updatedBookmark = await bookmarkService.createOrUpdateBookmark(payload)

      setAllBookmarks(prev => {
        const existing = prev.find(b => b.mangaId === mangaId)
        return existing ? prev.map(b => (b.mangaId === mangaId ? updatedBookmark : b)) : [...prev, updatedBookmark]
      })

      setBookmarks(prev => {
        const existing = prev.find(b => b.mangaId === mangaId)
        return existing ? prev.map(b => (b.mangaId === mangaId ? updatedBookmark : b)) : [...prev, updatedBookmark]
      })

      return updatedBookmark
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to toggle favorite')
    }
  }, [allBookmarks])

  const changeStatus = useCallback(async (mangaId: number, status: BookmarkStatus) => {
    try {
      const currentBookmark = allBookmarks.find(b => b.mangaId === mangaId)
      const updatedBookmark = await bookmarkService.createOrUpdateBookmark({
        mangaId,
        status,
        isFavorite: currentBookmark?.isFavorite ?? false
      })

      setAllBookmarks(prev => {
        const existing = prev.find(b => b.mangaId === mangaId)
        return existing ? prev.map(b => (b.mangaId === mangaId ? updatedBookmark : b)) : [...prev, updatedBookmark]
      })

      setBookmarks(prev => {
        const existing = prev.find(b => b.mangaId === mangaId)
        return existing ? prev.map(b => (b.mangaId === mangaId ? updatedBookmark : b)) : [...prev, updatedBookmark]
      })

      return updatedBookmark
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to change status')
    }
  }, [allBookmarks])

  const getMangaBookmark = useCallback((mangaId: number): Bookmark | undefined => {
    return allBookmarks.find(b => b.mangaId === mangaId)
  }, [allBookmarks])

  const getBookmarksByStatus = useCallback((status: BookmarkStatus): Bookmark[] => {
    return allBookmarks.filter(b => b.status === status)
  }, [allBookmarks])

  const getFavorites = useCallback((): Bookmark[] => {
    return allBookmarks.filter(b => b.isFavorite)
  }, [allBookmarks])

  const contextValue = useMemo<BookmarksContextValue>(() => ({
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
    clientFilterAndSort,
    refetch: fetchBookmarks,
    hydrateMangaBookmarks
  }), [
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
    clientFilterAndSort,
    fetchBookmarks,
    hydrateMangaBookmarks
  ])

  return React.createElement(
    BookmarksContext.Provider,
    { value: contextValue },
    children
  )
}

export const useBookmarks = (): BookmarksContextValue => {
  const context = useContext(BookmarksContext)
  if (!context) {
    throw new Error('useBookmarks must be used within a BookmarksProvider')
  }
  return context
}

export const useBookmarkStats = () => {
  const { allBookmarks, loading } = useBookmarks()

  const stats = useMemo(() => {
    const base = {
      READING: 0,
      PLAN_TO_READ: 0,
      COMPLETED: 0,
      ON_HOLD: 0,
      DROPPED: 0,
      favorites: 0
    }

    allBookmarks.forEach(bookmark => {
      base[bookmark.status] += 1
      if (bookmark.isFavorite) {
        base.favorites += 1
      }
    })

    return base
  }, [allBookmarks])

  return { stats, loading }
}
