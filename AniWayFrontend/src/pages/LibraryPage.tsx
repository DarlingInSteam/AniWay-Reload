import React, { useState } from 'react'
import { useBookmarks } from '../hooks/useBookmarks'
import { useAuth } from '../contexts/AuthContext'
import { BookmarkStatus } from '../types'
import { BookmarkBadge } from '../components/bookmarks/BookmarkControls'
import { BookmarkMangaCard } from '../components/manga/BookmarkMangaCard'
import { Edit } from 'lucide-react'

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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 lg:px-8 py-4 md:py-8">
        {/* Заголовок */}
        <div className="mb-6 md:mb-8">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 bg-gradient-to-r from-white to-muted-foreground bg-clip-text text-transparent">
              Моя библиотека
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              Управляйте своими закладками и отслеживайте прогресс чтения
            </p>
          </div>
        </div>

        {/* Мобильная версия - список закладок и кнопка редактирования сверху */}
        <div className="lg:hidden mb-6 space-y-4">
          {/* Кнопка редактирования закладок */}
          <button
            className="w-full h-12 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-white/15 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
            disabled
            title="Функция в разработке"
          >
            <Edit className="h-5 w-5" />
            Редактировать закладки
          </button>

          {/* Список закладок */}
          <div className="bg-card/30 backdrop-blur-sm border border-border/30 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Закладки</h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedStatus('ALL')}
                className={`text-center px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                  selectedStatus === 'ALL'
                    ? 'bg-primary text-white'
                    : 'text-muted-foreground hover:text-white hover:bg-white/10'
                }`}
              >
                Все ({bookmarks.length})
              </button>

              <button
                onClick={() => setSelectedStatus('FAVORITES')}
                className={`text-center px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                  selectedStatus === 'FAVORITES'
                    ? 'bg-red-500 text-white'
                    : 'text-muted-foreground hover:text-white hover:bg-white/10'
                }`}
              >
                ❤️ Избранное ({getStatusCount('FAVORITES')})
              </button>

              {Object.entries(statusLabels).map(([status, label]) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status as BookmarkStatus)}
                  className={`text-center px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                    selectedStatus === status
                      ? `text-white ${statusColors[status as BookmarkStatus]}`
                      : 'text-muted-foreground hover:text-white hover:bg-white/10'
                  }`}
                >
                  {label} ({getStatusCount(status as BookmarkStatus)})
                </button>
              ))}
            </div>
          </div>

          {/* Поиск в мобильной версии */}
          <input
            type="text"
            placeholder="Поиск по названию, автору или жанру..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-card border border-border/30 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
          />

          {/* Сортировка в мобильной версии */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Сортировка</label>
            <div className="flex gap-3 items-end">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 bg-card border border-border/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
              >
                {Object.entries(sortOptions).map(([value, label]) => (
                  <option key={value} value={value} className="bg-card text-white">
                    {label}
                  </option>
                ))}
              </select>

              <div className="flex gap-2">
                <button
                  onClick={() => setSortOrder('desc')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortOrder === 'desc'
                      ? 'bg-primary text-white'
                      : 'bg-card/50 text-muted-foreground hover:text-white hover:bg-white/10'
                  }`}
                >
                  По убыванию
                </button>
                <button
                  onClick={() => setSortOrder('asc')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortOrder === 'asc'
                      ? 'bg-primary text-white'
                      : 'bg-card/50 text-muted-foreground hover:text-white hover:bg-white/10'
                  }`}
                >
                  По возрастанию
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Десктопная версия - двухколоночная структура */}
        <div className="hidden lg:flex flex-row gap-6">
          {/* Левый столбец - шире */}
          <div className="flex-1 lg:flex-[2]">
            {/* Поиск */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Поиск по названию, автору или жанру..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 bg-card border border-border/30 rounded-xl text-white placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
              />
            </div>

            {/* Сортировка в десктопной версии */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-white mb-2">Сортировка</label>
              <div className="flex gap-3 items-end">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-3 py-2 bg-card border border-border/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                >
                  {Object.entries(sortOptions).map(([value, label]) => (
                    <option key={value} value={value} className="bg-card text-white">
                      {label}
                    </option>
                  ))}
                </select>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSortOrder('desc')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      sortOrder === 'desc'
                        ? 'bg-primary text-white'
                        : 'bg-card/50 text-muted-foreground hover:text-white hover:bg-white/10'
                    }`}
                  >
                    По убыванию
                  </button>
                  <button
                    onClick={() => setSortOrder('asc')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      sortOrder === 'asc'
                        ? 'bg-primary text-white'
                        : 'bg-card/50 text-muted-foreground hover:text-white hover:bg-white/10'
                    }`}
                  >
                    По возрастанию
                  </button>
                </div>
              </div>
            </div>

            {/* Список манг */}
            {filteredBookmarks.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📚</div>
                <h3 className="text-xl font-medium text-white mb-2">
                  {searchQuery ? 'Ничего не найдено' : 'Пока нет закладок'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery
                    ? 'Попробуйте изменить поисковый запрос'
                    : 'Добавьте манги в закладки, чтобы отслеживать свой прогресс чтения'
                  }
                </p>
                {!searchQuery && (
                  <a
                    href="/catalog"
                    className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
                  >
                    Перейти к каталогу
                  </a>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-6 animate-fade-in">
                {filteredBookmarks.map((bookmark) => (
                  <BookmarkMangaCard key={bookmark.id} bookmark={bookmark} />
                ))}
              </div>
            )}
          </div>

          {/* Правый столбец - уже */}
          <div className="w-full lg:w-80 lg:flex-shrink-0">
            {/* Контейнер с sticky позиционированием */}
            <div className="sticky top-4 space-y-6">
              {/* Кнопка редактирования закладок */}
              <div>
                <button
                  className="w-full h-12 px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white hover:bg-white/15 transition-all duration-200 flex items-center justify-center gap-2 font-medium"
                  disabled
                  title="Функция в разработке"
                >
                  <Edit className="h-5 w-5" />
                  Редактировать закладки
                </button>
              </div>

              {/* Список закладок */}
              <div className="bg-card/30 backdrop-blur-sm border border-border/30 rounded-xl p-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
                <h3 className="text-lg font-semibold text-white mb-4">Закладки</h3>

                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedStatus('ALL')}
                    className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                      selectedStatus === 'ALL'
                        ? 'bg-primary text-white'
                        : 'text-muted-foreground hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Все ({bookmarks.length})
                  </button>

                  <button
                    onClick={() => setSelectedStatus('FAVORITES')}
                    className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                      selectedStatus === 'FAVORITES'
                        ? 'bg-red-500 text-white'
                        : 'text-muted-foreground hover:text-white hover:bg-white/10'
                    }`}
                  >
                    ❤️ Избранное ({getStatusCount('FAVORITES')})
                  </button>

                  {Object.entries(statusLabels).map(([status, label]) => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status as BookmarkStatus)}
                      className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${
                        selectedStatus === status
                          ? `text-white ${statusColors[status as BookmarkStatus]}`
                          : 'text-muted-foreground hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {label} ({getStatusCount(status as BookmarkStatus)})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Список манг для мобильной версии */}
        <div className="lg:hidden">
          {filteredBookmarks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-medium text-white mb-2">
                {searchQuery ? 'Ничего не найдено' : 'Пока нет закладок'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? 'Попробуйте изменить поисковый запрос'
                  : 'Добавьте манги в закладки, чтобы отслеживать свой прогресс чтения'
                }
              </p>
              {!searchQuery && (
                <a
                  href="/catalog"
                  className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
                >
                  Перейти к каталогу
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4 animate-fade-in">
              {filteredBookmarks.map((bookmark) => (
                <BookmarkMangaCard key={bookmark.id} bookmark={bookmark} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
