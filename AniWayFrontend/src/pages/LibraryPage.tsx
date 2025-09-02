import React, { useState } from 'react'
import { useBookmarks } from '../hooks/useBookmarks'
import { useAuth } from '../contexts/AuthContext'
import { BookmarkStatus } from '../types'
import { BookmarkBadge } from '../components/bookmarks/BookmarkControls'
import { BookmarkMangaCard } from '../components/manga/BookmarkMangaCard'

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

export const LibraryPage: React.FC = () => {
  const { isAuthenticated } = useAuth()
  const { bookmarks, loading, getBookmarksByStatus, getFavorites } = useBookmarks()
  const [selectedStatus, setSelectedStatus] = useState<BookmarkStatus | 'FAVORITES' | 'ALL'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-manga-black">
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
      filtered = filtered.filter(bookmark =>
        bookmark.manga?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark.manga?.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bookmark.manga?.genre.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered
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
      <div className="min-h-screen flex items-center justify-center bg-manga-black">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 bg-manga-black min-h-screen">
      {/* Заголовок */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Моя библиотека</h1>
        <p className="text-muted-foreground">Управляйте своими закладками и отслеживайте прогресс чтения</p>
      </div>

      {/* Поиск */}
      <div className="mb-6">
        <div className="max-w-md">
          <input
            type="text"
            placeholder="Поиск по названию, автору или жанру..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 bg-card border border-border/30 rounded-lg text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
          />
        </div>
      </div>

      {/* Фильтры */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setSelectedStatus('ALL')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === 'ALL'
                ? 'bg-primary text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Все ({bookmarks.length})
          </button>

          <button
            onClick={() => setSelectedStatus('FAVORITES')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedStatus === 'FAVORITES'
                ? 'bg-red-500 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            ❤️ Избранное ({getStatusCount('FAVORITES')})
          </button>

          {Object.entries(statusLabels).map(([status, label]) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status as BookmarkStatus)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors relative ${
                selectedStatus === status
                  ? 'text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              style={{
                backgroundColor: selectedStatus === status ? statusColors[status as BookmarkStatus].replace('bg-', '') : undefined
              }}
            >
              {selectedStatus === status && (
                <div className={`absolute inset-0 ${statusColors[status as BookmarkStatus]} rounded-lg`} />
              )}
              <span className="relative">
                {label} ({getStatusCount(status as BookmarkStatus)})
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Список манг */}
      {filteredBookmarks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-medium text-gray-900 mb-2">
            {searchQuery ? 'Ничего не найдено' : 'Пока нет закладок'}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery 
              ? 'Попробуйте изменить поисковый запрос' 
              : 'Добавьте манги в закладки, чтобы отслеживать свой прогресс чтения'
            }
          </p>
          {!searchQuery && (
            <a
              href="/catalog"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Перейти к каталогу
            </a>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
          {filteredBookmarks.map((bookmark) => (
            <BookmarkMangaCard key={bookmark.id} bookmark={bookmark} />
          ))}
        </div>
      )}
    </div>
  )
}
