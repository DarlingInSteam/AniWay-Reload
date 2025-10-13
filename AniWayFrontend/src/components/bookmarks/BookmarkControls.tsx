import React, { useState } from 'react'
import { ChevronDown, Heart } from 'lucide-react'
import { BookmarkStatus } from '../../types'
import { useBookmarks } from '../../hooks/useBookmarks'
import { useAuth } from '../../contexts/AuthContext'

interface BookmarkControlsProps {
  mangaId: number
  className?: string
}

const statusLabels: Record<BookmarkStatus, string> = {
  READING: 'Читаю',
  PLAN_TO_READ: 'Буду читать',
  COMPLETED: 'Прочитано',
  ON_HOLD: 'Отложено',
  DROPPED: 'Брошено'
}

const statusColors: Record<BookmarkStatus, string> = {
  READING: 'bg-green-100 text-green-800',
  PLAN_TO_READ: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-purple-100 text-purple-800',
  ON_HOLD: 'bg-yellow-100 text-yellow-800',
  DROPPED: 'bg-red-100 text-red-800'
}

export const BookmarkControls: React.FC<BookmarkControlsProps> = ({ mangaId, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { isAuthenticated } = useAuth()
  const { getMangaBookmark, addBookmark, removeBookmark, toggleFavorite, changeStatus } = useBookmarks()

  const bookmark = getMangaBookmark(mangaId)

  const handleStatusChange = async (status: BookmarkStatus) => {
    if (!isAuthenticated) return

    setLoading(true)
    try {
      if (bookmark) {
        await changeStatus(mangaId, status)
      } else {
        await addBookmark(mangaId, status)
      }
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to change status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveBookmark = async () => {
    if (!isAuthenticated || !bookmark) return

    setLoading(true)
    try {
      await removeBookmark(mangaId)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to remove bookmark:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) return

    setLoading(true)
    try {
      await toggleFavorite(mangaId)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        <a href="/login" className="text-primary hover:text-primary/80">
          Войдите
        </a>
        {' '}для добавления в закладки
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className={`w-full inline-flex items-center justify-between gap-3 px-6 py-3 rounded-lg text-sm font-medium bg-primary text-white transition-colors hover:bg-primary/90 ${
          loading ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <span>{bookmark ? statusLabels[bookmark.status] : 'Добавить в список'}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full min-w-[14rem] bg-card rounded-lg shadow-lg border border-border/30 py-2 z-50">
          {Object.entries(statusLabels).map(([status, label]) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status as BookmarkStatus)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center justify-between ${
                bookmark?.status === status ? 'bg-primary/20 text-primary font-medium' : 'text-white hover:bg-secondary'
              }`}
            >
              <span>{label}</span>
              {bookmark?.status === status && <span className="text-xs uppercase">выбрано</span>}
            </button>
          ))}

          <hr className="my-2 border-border/30" />
          <button
            onClick={handleToggleFavorite}
            className={`w-full px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
              bookmark?.isFavorite ? 'text-amber-300 bg-amber-500/10' : 'text-white hover:text-amber-200 hover:bg-amber-500/10'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Heart className={`w-4 h-4 ${bookmark?.isFavorite ? 'fill-current' : ''}`} />
            <span>{bookmark?.isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}</span>
          </button>

          {bookmark && (
            <>
              <hr className="my-2 border-border/30" />
              <button
                onClick={handleRemoveBookmark}
                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Удалить из списка
              </button>
            </>
          )}
        </div>
      )}

      {/* Backdrop для закрытия меню */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

interface BookmarkBadgeProps {
  bookmark: { status: BookmarkStatus; isFavorite: boolean }
  size?: 'sm' | 'md'
}

export const BookmarkBadge: React.FC<BookmarkBadgeProps> = ({ bookmark, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm'
  
  return (
    <div className="flex items-center space-x-2">
      <span className={`${statusColors[bookmark.status]} ${sizeClasses} rounded-full font-medium`}>
        {statusLabels[bookmark.status]}
      </span>
      {bookmark.isFavorite && (
        <span className="text-red-500" title="В избранном">
          <svg className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'}`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </span>
      )}
    </div>
  )
}
