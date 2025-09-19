import React, { useState, useRef, useEffect } from 'react'
import { useBookmarks } from '../hooks/useBookmarks'
import { useAuth } from '../contexts/AuthContext'
import { BookmarkStatus } from '../types'
import { BookmarkMangaCard } from '../components/manga/BookmarkMangaCard'
import { ArrowUpDown, ArrowUp, ArrowDown, Heart } from 'lucide-react'
import { cn } from '../lib/utils'

const statusLabels: Record<BookmarkStatus, string> = {
  READING: 'Читаю',
  PLAN_TO_READ: 'Буду читать',
  COMPLETED: 'Прочитано',
  ON_HOLD: 'Отложено',
  DROPPED: 'Брошено'
}

const statusColors: Record<BookmarkStatus, string> = {
  READING: 'bg-green-500',
  PLAN_TO_READ: 'bg-blue-500',
  COMPLETED: 'bg-purple-500',
  ON_HOLD: 'bg-yellow-500',
  DROPPED: 'bg-red-500'
}

type SortOption = 'bookmark_updated' | 'manga_updated' | 'chapters_count' | 'alphabetical'
type SortOrder = 'asc' | 'desc'

const sortOptions: Record<SortOption, string> = {
  bookmark_updated: 'По новизне',
  manga_updated: 'По дате обновления',
  chapters_count: 'По кол-ву глав',
  alphabetical: 'По алфавиту'
}

export const LibraryPage: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const { bookmarks, loading, getBookmarksByStatus, getFavorites } = useBookmarks()
  const [selectedStatus, setSelectedStatus] = useState<BookmarkStatus | 'FAVORITES' | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('bookmark_updated')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // Ref для обработки кликов вне области dropdown
  const sortDropdownRef = useRef<HTMLDivElement>(null)
  const chipsContainerRef = useRef<HTMLDivElement>(null)

  // Закрываем dropdown сортировки при клике вне его области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
        setShowSortDropdown(false)
      }
    }

    if (showSortDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSortDropdown])

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Требуется авторизация
          </h2>
          <a href="/login" className="text-primary hover:text-primary/80">
            Войти в систему
          </a>
        </div>
      </div>
    )
  }

  const sortBookmarks = (bookmarksToSort: any[], sortOption: SortOption) => {
    const sorted = [...bookmarksToSort]

    switch (sortOption) {
      case 'bookmark_updated':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime()
          const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime()
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
        })

      case 'manga_updated':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.manga?.updatedAt || a.manga?.createdAt || 0).getTime()
          const dateB = new Date(b.manga?.updatedAt || b.manga?.createdAt || 0).getTime()
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB
        })

      case 'chapters_count':
        return sorted.sort((a, b) => {
          const chaptersA = a.manga?.totalChapters || 0
          const chaptersB = b.manga?.totalChapters || 0
          return sortOrder === 'desc' ? chaptersB - chaptersA : chaptersA - chaptersB
        })

      case 'alphabetical':
        return sorted.sort((a, b) => {
          const titleA = (a.manga?.title || a.mangaTitle || '').toLowerCase()
          const titleB = (b.manga?.title || b.mangaTitle || '').toLowerCase()
          return sortOrder === 'desc' ? titleB.localeCompare(titleA, 'ru') : titleA.localeCompare(titleB, 'ru')
        })

      default:
        return sorted
    }
  }

  const getFilteredBookmarks = () => {
    let filtered = bookmarks

    // Фильтр по статусу
    if (selectedStatus === 'FAVORITES') {
      filtered = getFavorites()
    } else if (selectedStatus !== 'ALL') {
      filtered = getBookmarksByStatus(selectedStatus as BookmarkStatus)
    }

    // Поиск
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(bookmark => {
        // Получаем название из разных возможных источников
        const title = bookmark.manga?.title || bookmark.mangaTitle || ''
        const author = bookmark.manga?.author || ''
        const genre = bookmark.manga?.genre || ''

        // Ищем совпадения в названии, авторе или жанре
        return (
          title.toLowerCase().includes(query) ||
          author.toLowerCase().includes(query) ||
          genre.toLowerCase().includes(query)
        )
      })
    }

    // Сортировка
    return sortBookmarks(filtered, sortBy)
  }

  const filteredBookmarks = getFilteredBookmarks()

  const getStatusCount = (status: BookmarkStatus | 'FAVORITES') => {
    if (status === 'FAVORITES') {
      return getFavorites().length
    }
    return getBookmarksByStatus(status as BookmarkStatus).length
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-5 md:py-8">
        {/* Toolbar */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 flex items-center gap-3">
              <input
                type="text"
                placeholder="Поиск по названию, автору или жанру..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 px-4 rounded-xl bg-card border border-border/40 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition"
              />
              <div className="relative">
                <button
                  className="flex items-center gap-2 h-11 px-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-sm font-medium text-white/80 hover:text-white transition"
                  type="button"
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                >
                  <span className="hidden sm:inline">{sortOptions[sortBy]}</span>
                  <ArrowUpDown className="h-4 w-4" />
                </button>
                {showSortDropdown && (
                  <div ref={sortDropdownRef} className="absolute right-0 mt-2 w-72 bg-card rounded-xl shadow-xl z-50 border border-border/60 animate-fade-in">
                    <div className="p-4">
                      <div className="text-xs text-muted-foreground mb-3 font-medium tracking-wide uppercase">Сортировать по</div>
                      <div className="space-y-1 mb-4">
                        {Object.entries(sortOptions).map(([value, label]) => (
                          <button
                            key={value}
                            onClick={() => { setSortBy(value as SortOption); setShowSortDropdown(false); }}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150',
                              sortBy === value
                                ? 'bg-primary/15 text-primary border border-primary/30'
                                : 'text-muted-foreground hover:text-white hover:bg-white/10'
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="text-xs text-muted-foreground mb-3 font-medium tracking-wide uppercase">Направление</div>
                      <div className="flex gap-2">
                        {[
                          { label: 'Убыванию', value: 'desc', icon: ArrowDown },
                          { label: 'Возрастанию', value: 'asc', icon: ArrowUp }
                        ].map(dir => (
                          <button
                            key={dir.value}
                            onClick={() => { setSortOrder(dir.value as SortOrder); setShowSortDropdown(false); }}
                            className={cn(
                              'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-150',
                              sortOrder === dir.value
                                ? 'bg-primary/15 text-primary border border-primary/30'
                                : 'text-muted-foreground hover:text-white hover:bg-white/10 border border-transparent'
                            )}
                          >
                            <dir.icon className="h-4 w-4" />
                            {dir.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedStatus('FAVORITES')}
              className={cn(
                'flex items-center justify-center gap-2 h-11 px-4 rounded-xl text-sm font-medium transition border',
                selectedStatus === 'FAVORITES'
                  ? 'bg-red-500 text-white border-red-400'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border-white/10'
              )}
            >
              <Heart className={cn('h-4 w-4', selectedStatus === 'FAVORITES' && 'animate-pulse')} />
              <span className="hidden sm:inline">Избранное</span>
              <span className="text-xs sm:text-sm">({getStatusCount('FAVORITES')})</span>
            </button>
          </div>

          {/* Status chips */}
          <div ref={chipsContainerRef} className="flex overflow-x-auto no-scrollbar gap-2 pb-1 -ml-1 pr-1">
            <button
              onClick={() => setSelectedStatus('ALL')}
              className={cn(
                'px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap transition border flex items-center gap-2',
                selectedStatus === 'ALL'
                  ? 'bg-primary text-white border-primary/80 shadow'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border-white/10'
              )}
            >
              Все <span className="opacity-80">{bookmarks.length}</span>
            </button>
            {Object.entries(statusLabels).map(([status, label]) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status as BookmarkStatus)}
                className={cn(
                  'px-4 h-9 rounded-full text-sm font-medium whitespace-nowrap transition border flex items-center gap-2',
                  selectedStatus === status
                    ? `${statusColors[status as BookmarkStatus]} text-white border-white/20 shadow`
                    : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border-white/10'
                )}
              >
                {label} <span className="opacity-80">{getStatusCount(status as BookmarkStatus)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content grid */}
        {filteredBookmarks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery ? 'Ничего не найдено' : 'Пока нет закладок'}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchQuery
                ? 'Попробуйте изменить поисковый запрос'
                : 'Добавьте манги в закладки, чтобы отслеживать свой прогресс чтения'}
            </p>
            {!searchQuery && (
              <a
                href="/catalog"
                className="inline-flex items-center px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/80 transition-colors text-sm font-medium"
              >
                Перейти к каталогу
              </a>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-5 animate-fade-in">
            {filteredBookmarks.map((bookmark) => (
              <BookmarkMangaCard key={bookmark.id} bookmark={bookmark} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
