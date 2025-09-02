import { Bookmark, BookmarkRequest, BookmarkStatus } from '../types'
import { authService } from './authService'

class BookmarkService {
  private baseUrl = '/api'

  // Получить заголовки для аутентифицированных запросов
  private getAuthHeaders(): HeadersInit {
    const token = authService.getToken()
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  }

  // Получить все закладки пользователя
  async getUserBookmarks(): Promise<Bookmark[]> {
    const response = await fetch(`${this.baseUrl}/bookmarks`, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch bookmarks')
    }

    return response.json()
  }

  // Получить закладки по статусу
  async getBookmarksByStatus(status: BookmarkStatus): Promise<Bookmark[]> {
    const response = await fetch(`${this.baseUrl}/bookmarks/status/${status}`, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch bookmarks by status')
    }

    return response.json()
  }

  // Получить избранные манги
  async getFavoriteBookmarks(): Promise<Bookmark[]> {
    const response = await fetch(`${this.baseUrl}/bookmarks/favorites`, {
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch favorite bookmarks')
    }

    return response.json()
  }

  // Создать или обновить закладку
  async createOrUpdateBookmark(data: BookmarkRequest): Promise<Bookmark> {
    const response = await fetch(`${this.baseUrl}/bookmarks`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      throw new Error('Failed to create/update bookmark')
    }

    return response.json()
  }

  // Удалить закладку
  async deleteBookmark(mangaId: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/bookmarks/${mangaId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to delete bookmark')
    }
  }

  // Получить статус манги в закладках
  async getMangaBookmarkStatus(mangaId: number): Promise<Bookmark | null> {
    try {
      const bookmarks = await this.getUserBookmarks()
      return bookmarks.find(bookmark => bookmark.mangaId === mangaId) || null
    } catch {
      return null
    }
  }

  // Переключить избранное
  async toggleFavorite(mangaId: number): Promise<Bookmark> {
    const currentBookmark = await this.getMangaBookmarkStatus(mangaId)
    
    if (currentBookmark) {
      return this.createOrUpdateBookmark({
        mangaId,
        status: currentBookmark.status,
        isFavorite: !currentBookmark.isFavorite
      })
    } else {
      return this.createOrUpdateBookmark({
        mangaId,
        status: 'PLAN_TO_READ',
        isFavorite: true
      })
    }
  }

  // Изменить статус чтения
  async changeReadingStatus(mangaId: number, status: BookmarkStatus): Promise<Bookmark> {
    const currentBookmark = await this.getMangaBookmarkStatus(mangaId)
    
    return this.createOrUpdateBookmark({
      mangaId,
      status,
      isFavorite: currentBookmark?.isFavorite || false
    })
  }

  // Получить количество закладок по статусам
  async getBookmarkStats(): Promise<Record<BookmarkStatus, number> & { favorites: number }> {
    const bookmarks = await this.getUserBookmarks()
    
    const stats = {
      READING: 0,
      PLAN_TO_READ: 0,
      COMPLETED: 0,
      ON_HOLD: 0,
      DROPPED: 0,
      favorites: 0
    }

    bookmarks.forEach(bookmark => {
      stats[bookmark.status]++
      if (bookmark.isFavorite) {
        stats.favorites++
      }
    })

    return stats
  }
}

export const bookmarkService = new BookmarkService()
