import {
  AdminActionLogDTO,
  AdminUsersPageResponse,
  AdminUsersParams,
  ChapterDTO,
  ChapterCreateRequest,
  ChapterImageDTO,
  MangaResponseDTO,
  PageResponse,
  SearchParams,
  UpdateProfileRequest,
  User,
  UserSearchParams,
  UserSearchResult
} from '@/types';
import type {
  CategoryUnreadMap,
  CategoryView,
  ConversationView as ConversationDto,
  CreateCategoryPayload,
  FriendRequestView,
  FriendSummary,
  FriendView as FriendDto,
  InboxSummaryView,
  MessagePageView as MessagePageDto,
  MessageView as MessageDto,
  UpdateCategoryPayload
} from '@/types/social';

const API_BASE_URL = '/api';

class ApiClient {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('authToken');
  let userId = localStorage.getItem('userId') || localStorage.getItem('userID') || localStorage.getItem('currentUserId');
    let userRole = localStorage.getItem('userRole') || localStorage.getItem('user_role');
    if (userRole === 'null' || userRole === 'undefined' || userRole === '') {
      userRole = null;
    }
    // Fallback: try decode JWT payload (assuming standard 'sub' or 'userId' claim) if userId absent
    if(!userId && token){
      try {
        const payload = JSON.parse(atob(token.split('.')[1] || ''));
        const extracted = payload.userId || payload.userID || payload.sub || payload.id;
        if (extracted) {
          userId = String(extracted);
          localStorage.setItem('userId', userId);
        }
        const roleValue = payload.role || (Array.isArray(payload.authorities) ? payload.authorities[0] : undefined);
        if (roleValue && !userRole) {
          userRole = String(roleValue).toUpperCase().replace(/^ROLE_/, '');
          localStorage.setItem('userRole', userRole);
        }
      } catch { /* silent */ }
    }

    console.log(`API Request: ${options?.method || 'GET'} ${url}`);
    console.log(`Auth token present: ${!!token}`);

    // Heuristic: add X-User-Id for mutating post endpoints (backend expects it) and for comments
    const method = (options?.method || 'GET').toUpperCase();
    const needsUserHeader = !!userId && (
      (/^\/posts\b/.test(endpoint) && ['POST','PUT','DELETE','GET'].includes(method)) ||
      (/^\/posts\/.*\/vote$/.test(endpoint)) ||
      (/^\/comments\b/.test(endpoint) && ['POST','PUT','DELETE','GET'].includes(method)) ||
      (/^\/messages\b/.test(endpoint))
    );
    const normalizedUserRole = userRole ? userRole.toUpperCase().replace(/^ROLE_/, '') : undefined;
    const headerUserRole = normalizedUserRole || (token ? 'USER' : undefined);

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...(needsUserHeader ? {
          'X-User-Id': userId!,
          ...(headerUserRole ? { 'X-User-Role': headerUserRole } : {})
        } : {}),
        ...options?.headers,
      },
      ...options,
    });

    console.log(`API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error Details: ${errorText}`);
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Проверяем, есть ли содержимое в ответе
    const contentLength = response.headers.get('content-length');
    const contentType = response.headers.get('content-type');
    
    // Если нет содержимого или длина равна 0, возвращаем undefined как T
    if (contentLength === '0' || (!contentType?.includes('application/json') && !contentLength)) {
      return undefined as T;
    }

    // Пытаемся получить текст ответа
    const text = await response.text();
    
    // Если текст пустой, возвращаем undefined
    if (!text.trim()) {
      return undefined as T;
    }

    // Пытаемся парсить JSON
    try {
      return JSON.parse(text);
    } catch (error) {
      console.error('Failed to parse response as JSON:', text);
      throw new Error('Invalid JSON response');
    }
  }

  // Manga API
  async getAllManga(): Promise<MangaResponseDTO[]> {
    return this.request<MangaResponseDTO[]>('/manga');
  }

  async getMangaById(id: number, userId?: number): Promise<MangaResponseDTO> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId.toString());
    const queryString = params.toString();
    const endpoint = queryString ? `/manga/${id}?${queryString}` : `/manga/${id}`;
    return this.request<MangaResponseDTO>(endpoint);
  }

  async searchManga(params: SearchParams): Promise<MangaResponseDTO[]> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => { if (value) searchParams.append(key, value as any); });
    return this.request<MangaResponseDTO[]>(`/manga/search?${searchParams}`);
  }
  async getAllMangaPaged(page: number = 0, size: number = 10, sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc', filters?: any): Promise<PageResponse<MangaResponseDTO>> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sortBy,
      sortOrder
    });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (Array.isArray(value) && !['ageRating', 'rating', 'releaseYear', 'chapterRange'].includes(key)) {
            value.forEach(item => params.append(key, item.toString()));
          } else if (Array.isArray(value) && ['ageRating', 'rating', 'releaseYear', 'chapterRange'].includes(key)) {
            params.append(`${key}Min`, value[0].toString());
            params.append(`${key}Max`, value[1].toString());
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    return this.request<PageResponse<MangaResponseDTO>>(`/manga/paged?${params}`);
  }

  async searchMangaPaged(params: SearchParams): Promise<PageResponse<MangaResponseDTO>> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        if (Array.isArray(value) && !['ageRating', 'rating', 'releaseYear', 'chapterRange'].includes(key)) {
          // Для массивов добавляем каждый элемент отдельно
          value.forEach(item => searchParams.append(key, item.toString()));
        } else if (Array.isArray(value) && ['ageRating', 'rating', 'releaseYear', 'chapterRange'].includes(key)) {
          // Для диапазонов [min, max]
          searchParams.append(`${key}Min`, value[0].toString());
          searchParams.append(`${key}Max`, value[1].toString());
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    return this.request<PageResponse<MangaResponseDTO>>(`/manga/search/paged?${searchParams}`);
  }

  async updateManga(id: number, data: any): Promise<MangaResponseDTO> {
    return this.request<MangaResponseDTO>(`/manga/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteManga(id: number): Promise<void> {
    await this.request<void>(`/manga/${id}`, {
      method: 'DELETE',
    });
  }

  async getMangaChapters(mangaId: number): Promise<ChapterDTO[]> {
    // Try direct ChapterService endpoint first
    try {
      return await this.request<ChapterDTO[]>(`/chapters/manga/${mangaId}`);
    } catch (directError) {
      console.warn('Direct ChapterService endpoint failed, trying MangaService proxy:', directError)
      // Fallback to MangaService proxy
      return await this.request<ChapterDTO[]>(`/manga/${mangaId}/chapters`);
    }
  }

  // Chapter API
  async createChapter(payload: ChapterCreateRequest): Promise<ChapterDTO> {
    return this.request<ChapterDTO>(`/chapters`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateChapter(id: number, payload: ChapterCreateRequest): Promise<ChapterDTO> {
    return this.request<ChapterDTO>(`/chapters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteChapter(id: number): Promise<void> {
    await this.request<void>(`/chapters/${id}`, {
      method: 'DELETE',
    });
  }

  async getChapterById(id: number): Promise<ChapterDTO> {
    return this.request<ChapterDTO>(`/chapters/${id}`);
  }

  async getChaptersByManga(mangaId: number): Promise<ChapterDTO[]> {
    return this.request<ChapterDTO[]>(`/chapters/manga/${mangaId}`);
  }

  // Chapter Likes API
  async likeChapter(chapterId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/chapters/${chapterId}/like`, {
      method: 'POST',
    });
  }

  async unlikeChapter(chapterId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/chapters/${chapterId}/like`, {
      method: 'DELETE',
    });
  }

  async isChapterLiked(chapterId: number): Promise<{ liked: boolean }> {
    return this.request<{ liked: boolean }>(`/chapters/${chapterId}/like`);
  }

  async toggleChapterLike(chapterId: number): Promise<{ message: string; liked: boolean; likeCount: number }> {
    return this.request<{ message: string; liked: boolean; likeCount: number }>(`/chapters/${chapterId}/toggle-like`, {
      method: 'POST',
    });
  }

  // Image API
  async getChapterImages(chapterId: number): Promise<ChapterImageDTO[]> {
    return this.request<ChapterImageDTO[]>(`/images/chapter/${chapterId}`);
  }

  async getChapterImagePreview(chapterId: number): Promise<ChapterImageDTO[]> {
    return this.request<ChapterImageDTO[]>(`/images/chapter/${chapterId}/preview`);
  }

  // User API
  async searchUsers(params: UserSearchParams): Promise<UserSearchResult> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value.toString());
    });

    return this.request<UserSearchResult>(`/auth/users/search?${searchParams}`);
  }

  // ИСПРАВЛЕННЫЕ ЭНДПОИНТЫ ПОД БЭКЕНД

  // Получить текущего пользователя (исправлен путь)
  async getCurrentUser(): Promise<User> {
    return this.request<User>(`/auth/me`);
  }

  // Получить профиль пользователя по ID
  async getUserProfile(userId: number): Promise<User> {
    return this.request<User>(`/auth/users/${userId}`);
  }

  async getUserPublicProfile(userId: number): Promise<User> {
    // Simple in-memory caches to avoid duplicate requests & log noise
    if (!(globalThis as any).__publicProfileCache) {
      (globalThis as any).__publicProfileCache = new Map<number, Promise<User>>();
    }
    const cache: Map<number, Promise<User>> = (globalThis as any).__publicProfileCache;

    if (cache.has(userId)) {
      return cache.get(userId)!;
    }

    const promise = (async () => {
      try {
        return await this.request<User>(`/auth/users/${userId}/public`);
      } catch (error: any) {
        // For public profile 401/403/404 just throw a normalized error once
        const msg = String(error?.message || '');
        if (/401|403|404/.test(msg)) {
          console.warn(`Public profile not available for user ${userId}: ${msg}`);
          // Rethrow to keep existing upstream behavior (caller decides fallback)
        }
        throw error;
      }
    })();

    cache.set(userId, promise);
    // If it rejects, remove from cache to allow retry later
    promise.catch(() => cache.delete(userId));
    return promise;
  }

  // Обновить профиль текущего пользователя (использует существующий backend endpoint /api/users/me)
  async updateCurrentUserProfile(data: any): Promise<User> {
    return this.request<User>(`/users/me`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Обновить профиль пользователя через /api/users/profile эндпоинт
  async updateUserProfile(data: UpdateProfileRequest): Promise<User> {
    return this.request<User>(`/users/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Bookmarks API
  async getUserPublicBookmarks(username: string): Promise<any[]> {
    try {
      return this.request<any[]>(`/bookmarks/user/${username}`);
    } catch (error) {
      console.error(`Ошибка при загрузке публичных закладок для пользователя ${username}:`, error);
      return [];
    }
  }

  // =============================
  // Leaderboards (Топы)
  // =============================
  // Users leaderboard
  async getTopUsers(params: { metric: 'readers' | 'likes' | 'comments' | 'level'; limit?: number }): Promise<import('@/types').TopUserDTO[]> {
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 100);
    const searchParams = new URLSearchParams({ metric: params.metric, limit: String(limit) });
    return this.request<import('@/types').TopUserDTO[]>(`/auth/tops/users?${searchParams.toString()}`);
  }

  // Reviews leaderboard
  async getTopReviews(params: { days?: number; limit?: number }): Promise<import('@/types').TopReviewDTO[]> {
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 100);
    const searchParams = new URLSearchParams({ limit: String(limit) });
    if (params.days) searchParams.append('days', String(params.days));
    return this.request<import('@/types').TopReviewDTO[]>(`/auth/tops/reviews?${searchParams.toString()}`);
  }

  // Forum threads leaderboard (range: all | 7 | 30)
  async getTopThreads(params: { range?: 'all' | '7' | '30'; limit?: number }): Promise<import('@/types').TopForumThreadDTO[]> {
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 100);
    const searchParams = new URLSearchParams({ limit: String(limit) });
    if (params.range && params.range !== 'all') searchParams.append('range', params.range);
    return this.request<import('@/types').TopForumThreadDTO[]>(`/forum/tops/threads?${searchParams.toString()}`);
  }

  // Forum posts leaderboard (range: all | 7 | 30)
  async getTopPosts(params: { range?: 'all' | '7' | '30'; limit?: number }): Promise<import('@/types').TopForumPostDTO[]> {
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 100);
    const searchParams = new URLSearchParams({ limit: String(limit) });
    if (params.range && params.range !== 'all') searchParams.append('range', params.range);
    return this.request<import('@/types').TopForumPostDTO[]>(`/forum/tops/posts?${searchParams.toString()}`);
  }

  // Comments leaderboard (range: all | 7 | 30)
  async getTopComments(params: { range?: 'all' | '7' | '30'; limit?: number }): Promise<import('@/types').TopCommentDTO[]> {
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 100);
    const searchParams = new URLSearchParams({ limit: String(limit) });
    if (params.range && params.range !== 'all') searchParams.append('range', params.range);
    return this.request<import('@/types').TopCommentDTO[]>(`/comments/tops?${searchParams.toString()}`);
  }

  // Wall posts (user profile posts) leaderboard (range: all | 7 | 30 | today)
  async getTopWallPosts(params: { range?: 'all' | '7' | '30' | 'today'; limit?: number }): Promise<import('@/types').TopWallPostDTO[]> {
    const limit = Math.min(Math.max(params.limit ?? 10, 1), 100);
    const searchParams = new URLSearchParams({ limit: String(limit) });
    if (params.range && params.range !== 'all') searchParams.append('range', params.range);
    return this.request<import('@/types').TopWallPostDTO[]>(`/posts/tops?${searchParams.toString()}`);
  }

  async getUserPublicProgress(userId: number): Promise<any[]> {
    if (!(globalThis as any).__publicProgressCache) {
      (globalThis as any).__publicProgressCache = new Map<number, Promise<any[]>>();
    }
    const cache: Map<number, Promise<any[]>> = (globalThis as any).__publicProgressCache;

    if (cache.has(userId)) {
      return cache.get(userId)!;
    }

    const promise = (async () => {
      try {
  return await this.request<any[]>(`/auth/users/${userId}/public/progress`);
      } catch (error: any) {
        const msg = String(error?.message || '');
        if (/401|403/.test(msg)) {
          // Silent fallback: no permission to view public progress
          console.info(`Public progress unauthorized for user ${userId}`);
          return [];
        }
        if (/404/.test(msg)) {
          console.info(`Public progress not found for user ${userId}`);
          return [];
        }
        console.warn(`Public progress fetch error for user ${userId}:`, error);
        return [];
      }
    })();

    cache.set(userId, promise);
    promise.catch(() => cache.delete(userId));
    return promise;
  }

  async getUserBookmarksByStatus(status: string): Promise<any[]> {
    return this.request<any[]>(`/bookmarks/status/${status}`);
  }

  async getUserFavorites(): Promise<any[]> {
    return this.request<any[]>(`/bookmarks/favorites`);
  }

  // КРИТИЧЕСКИ ВАЖНЫЕ API - ОБНОВЛЕННЫЕ ПОД БЭКЕНД

  // 1. Управление избранными манга (используем существующий bookmark API)
  async updateFavorites(mangaIds: number[]): Promise<{ success: boolean; message: string }> {
    // Поскольку на бэкенде нет массового обновления избранного,
    // реализуем через последовательные запросы к bookmark API
    try {
      await Promise.all(
        mangaIds.map(mangaId =>
          this.request<any>('/bookmarks', {
            method: 'POST',
            body: JSON.stringify({
              mangaId,
              isFavorite: true
            }),
          })
        )
      );
      return { success: true, message: 'Избранное обновлено' };
    } catch (error) {
      return { success: false, message: 'Ошибка обновления избранного' };
    }
  }

  async addToFavorites(mangaId: number): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<any>('/bookmarks', {
        method: 'POST',
        body: JSON.stringify({
          mangaId,
          isFavorite: true
        }),
      });
      return { success: true, message: 'Добавлено в избранное' };
    } catch (error) {
      return { success: false, message: 'Ошибка добавления в избранное' };
    }
  }

  async removeFromFavorites(mangaId: number): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<any>('/bookmarks', {
        method: 'POST',
        body: JSON.stringify({
          mangaId,
          isFavorite: false
        }),
      });
      return { success: true, message: 'Удалено из избранного' };
    } catch (error) {
      return { success: false, message: 'Ошибка удаления из избранного' };
    }
  }

  // 2. Управление коллекциями - пока используем bookmark статусы
  async createCollection(data: { name: string; description?: string; isPublic?: boolean; mangaIds?: number[] }): Promise<any> {
    // На бэкенде нет отдельного API для коллекций, используем статусы закладок
    console.warn('Коллекции пока реализованы через статусы закладок');
    return {
      id: `collection-${Date.now()}`,
      name: data.name,
      description: data.description,
      isPublic: data.isPublic || false,
      mangaCount: data.mangaIds?.length || 0
    };
  }

  async updateCollection(_id: string, _data: { name?: string; description?: string; isPublic?: boolean; mangaIds?: number[] }): Promise<any> {
    console.warn('Обновление коллекций пока не реализовано на бэкенде');
    return { success: true, message: 'Коллекция обновлена (заглушка)' };
  }

  async deleteCollection(_id: string): Promise<{ success: boolean; message: string }> {
    console.warn('Удаление коллекций пока не реализовано на бэкенде');
    return { success: true, message: 'Коллекция удалена (заглушка)' };
  }

  async getUserCollections(): Promise<any[]> {
    // Возвращаем коллекции на основе статусов закладок
    try {
      const bookmarks = await this.getUserBookmarks();

      // Группируем по статусам как коллекции
      return [
        {
          id: 'reading',
          name: 'Читаю',
          mangaCount: bookmarks.filter(b => b.status === 'READING').length,
          isPublic: true
        },
        {
          id: 'completed',
          name: 'Прочитано',
          mangaCount: bookmarks.filter(b => b.status === 'COMPLETED').length,
          isPublic: true
        },
        {
          id: 'plan_to_read',
          name: 'В планах',
          mangaCount: bookmarks.filter(b => b.status === 'PLAN_TO_READ').length,
          isPublic: true
        }
      ];
    } catch (error) {
      return [];
    }
  }

  async getCollectionById(id: string): Promise<any> {
    console.warn('getCollectionById пока не реализован на бэкенде');
    // Возвращаем заглушку на основе статуса закладок
    const collections = await this.getUserCollections();
    const collection = collections.find(c => c.id === id);
    if (collection) {
      return collection;
    }
    throw new Error('Коллекция не найдена');
  }

  async addMangaToCollection(_collectionId: string, _mangaId: number): Promise<{ success: boolean; message: string }> {
    console.warn('addMangaToCollection пока не реализован на бэкенде');
    // Заглушка - в будущем будет реальный API
    return { success: true, message: 'Манга добавлена в коллекцию (заглушка)' };
  }

  async removeMangaFromCollection(_collectionId: string, _mangaId: number): Promise<{ success: boolean; message: string }> {
    console.warn('removeMangaFromCollection пока не реализован на бэкенде');
    // Заглушка - в будущем будет реальный API
    return { success: true, message: 'Манга удалена из коллекции (заглушка)' };
  }

  async getUserBookmarks(): Promise<any[]> {
    return this.request<any[]>('/bookmarks');
  }

  async getPublicUserBookmarks(username: string): Promise<any[]> {
    return this.request<any[]>(`/bookmarks/user/${username}`);
  }

  // 3. Управление прогрессом чтения (используем существующий API)
  // Дополнительные API для получения информации для комментариев
  async getMangaTitle(mangaId: number): Promise<string | null> {
    try {
      const manga = await this.getMangaById(mangaId);
      return manga.title;
    } catch (error) {
      console.error(`Ошибка получения названия манги ${mangaId}:`, error);
      return null;
    }
  }

  async getChapterTitle(chapterId: number): Promise<{ title: string; mangaTitle: string } | null> {
    try {
      const chapter = await this.getChapterById(chapterId);
      const mangaTitle = await this.getMangaTitle(chapter.mangaId);
      return {
        title: chapter.title || `Глава ${chapter.chapterNumber}`,
        mangaTitle: mangaTitle || `Манга #${chapter.mangaId}`
      };
    } catch (error) {
      console.error(`Ошибка получения информации о главе ${chapterId}:`, error);
      return null;
    }
  }

  async getUsernameById(userId: number): Promise<string | null> {
    try {
      const user = await this.getUserProfile(userId);
      return user.username;
    } catch (error) {
      console.error(`Ошибка получения имени пользователя ${userId}:`, error);
      return null;
    }
  }

  // Пакетное получение информации для комментариев
  async getCommentTargetInfo(type: string, targetId: number): Promise<{ text: string; icon: string; color: string } | null> {
    try {
      switch (type) {
        case 'MANGA':
          const mangaTitle = await this.getMangaTitle(targetId);
          return mangaTitle 
            ? { text: mangaTitle, icon: '📖', color: 'text-purple-400' }
            : { text: `Манга #${targetId}`, icon: '📖', color: 'text-purple-400' };

        case 'CHAPTER':
          const chapterInfo = await this.getChapterTitle(targetId);
          return chapterInfo 
            ? { text: `${chapterInfo.title} (${chapterInfo.mangaTitle})`, icon: '📄', color: 'text-blue-400' }
            : { text: `Глава #${targetId}`, icon: '📄', color: 'text-blue-400' };

        case 'PROFILE':
          const username = await this.getUsernameById(targetId);
          return username 
            ? { text: `@${username}`, icon: '👤', color: 'text-green-400' }
            : { text: `Профиль #${targetId}`, icon: '👤', color: 'text-green-400' };

        case 'REVIEW':
          // Для отзывов пока используем простое отображение
          return { text: `Отзыв #${targetId}`, icon: '⭐', color: 'text-yellow-400' };

        default:
          return { text: `${type} #${targetId}`, icon: '❓', color: 'text-gray-400' };
      }
    } catch (error) {
      console.error(`Ошибка получения информации о цели комментария ${type}:${targetId}:`, error);
      return { text: `${type} #${targetId}`, icon: '❓', color: 'text-gray-400' };
    }
  }

  async updateReadingProgress(mangaId: number, data: {
    chapterNumber: number;
    pageNumber?: number;
    status?: 'READING' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED' | 'PLAN_TO_READ';
    isCompleted?: boolean;
  }): Promise<any> {
    // Используем существующий Progress API
    return this.request<any>(`/auth/progress`, {
      method: 'POST',
      body: JSON.stringify({
        mangaId,
        chapterNumber: data.chapterNumber,
        pageNumber: data.pageNumber || 1,
        isCompleted: data.isCompleted || false
      }),
    });
  }

  async getReadingProgress(mangaId: number): Promise<any> {
    return this.request<any>(`/auth/progress/manga/${mangaId}`);
  }

  async markChapterAsRead(mangaId: number, chapterNumber: number): Promise<{ success: boolean; message: string }> {
    try {
      await this.updateReadingProgress(mangaId, {
        chapterNumber,
        isCompleted: true
      });
      return { success: true, message: 'Глава отмечена как прочитанная' };
    } catch (error) {
      return { success: false, message: 'Ошибка отметки главы' };
    }
  }

  async markMangaAsCompleted(mangaId: number): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<any>('/bookmarks', {
        method: 'POST',
        body: JSON.stringify({
          mangaId,
          status: 'COMPLETED'
        }),
      });
      return { success: true, message: 'Манга отмечена как завершенная' };
    } catch (error) {
      return { success: false, message: 'Ошибка завершения манги' };
    }
  }

  // 4. Управление отзывами
  async createReview(mangaId: number, data: {
    rating: number;
    comment: string;
  }): Promise<any> {
    try {
      return await this.request<any>(`/auth/reviews/manga/${mangaId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch (error) {
        console.error('Ошибка при создании отзыва:', error);
        throw error instanceof Error ? error : new Error('Не удалось создать отзыв');
    }
  }

  async updateReview(reviewId: string, data: {
    rating: number;
    comment: string;
  }): Promise<any> {
    try {
      return await this.request<any>(`/auth/reviews/${reviewId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    } catch (error) {
        console.error('Ошибка при обновлении отзыва:', error);
        throw error instanceof Error ? error : new Error('Не удалось обновить отзыв');
    }
  }

  async deleteReview(reviewId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<any>(`/auth/reviews/${reviewId}`, {
        method: 'DELETE',
      });
      return { success: true, message: 'Отзыв удален' };
    } catch (error) {
      return { success: false, message: 'Ошибка удаления отзыва' };
    }
  }

  async getUserReviews(userId?: number): Promise<any[]> {
    try {
      if (userId) {
        return await this.request<any[]>(`/auth/reviews/user/${userId}`);
      } else {
        // Если не передан userId, получаем отзывы текущего пользователя
        const currentUser = await this.getCurrentUser();
        return await this.request<any[]>(`/auth/reviews/user/${currentUser.id}`);
      }
    } catch (error) {
      console.error('Ошибка получения отзывов пользователя:', error);
      return [];
    }
  }

  async getReviewById(reviewId: string | number): Promise<any> {
    try {
      // Поскольку GET метода для отзыва по ID нет в API,
      // мы можем попытаться использовать другой подход через поиск отзывов
      // Это временное решение до добавления GET метода в API
      console.warn('GET /auth/reviews/{reviewId} не задокументирован в API, используем альтернативный подход');
      
      // Попробуем все равно выполнить запрос, возможно метод существует, но не задокументирован
      return await this.request<any>(`/auth/reviews/${reviewId}`);
    } catch (error) {
      console.error('Ошибка получения отзыва по ID:', error);
      throw error;
    }
  }

  async getMangaReviews(mangaId: number): Promise<any[]> {
    try {
      return await this.request<any[]>(`/auth/reviews/manga/${mangaId}`);
    } catch (error) {
      console.error('Ошибка получения отзывов манги:', error);
      return [];
    }
  }

  async likeReview(reviewId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<any>(`/auth/reviews/${reviewId}/like`, {
        method: 'POST',
        body: JSON.stringify({ isLike: true }),
      });
      return { success: true, message: 'Лайк поставлен' };
    } catch (error) {
      return { success: false, message: 'Ошибка постановки лайка' };
    }
  }

  async unlikeReview(reviewId: string): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<any>(`/auth/reviews/${reviewId}/like`, {
        method: 'POST',
        body: JSON.stringify({ isLike: false }),
      });
      return { success: true, message: 'Лайк снят' };
    } catch (error) {
      return { success: false, message: 'Ошибка снятия лайка' };
    }
  }

  // Получить данные рейтинга манги
  async getMangaRatingData(mangaId: number): Promise<any> {
    try {
      return this.request<any>(`/auth/reviews/manga/${mangaId}/rating`);
    } catch (error) {
      console.error('Failed to get manga rating data:', error);
      throw error;
    }
  }

  // Получить отзыв текущего пользователя для манги
  async getUserMangaReview(mangaId: number): Promise<any> {
    try {
      return this.request<any>(`/auth/reviews/manga/${mangaId}/my`);
    } catch (error) {
      console.error('Failed to get user manga review:', error);
      throw error;
    }
  }

  // Поставить дизлайк отзыву
  async dislikeReview(reviewId: string | number): Promise<{ success: boolean; message: string }> {
    try {
      await this.request<void>(`/auth/reviews/${reviewId}/dislike`, {
        method: 'POST',
      });
      return { success: true, message: 'Дизлайк поставлен' };
    } catch (error) {
      console.error('Failed to dislike review:', error);
      return { success: false, message: 'Не удалось поставить дизлайк' };
    }
  }

  // РАСШИРЕННЫЙ ФУНКЦИОНАЛ - АДАПТИРОВАННЫЙ ПОД БЭКЕНД

  // 5. Настройки профиля (используем существующий PUT /users/me)
  async updateProfileSettings(data: {
    displayName?: string;
    bio?: string;
    backgroundImage?: string;
    socialLinks?: any;
    privacySettings?: any;
  }): Promise<any> {
    return this.updateCurrentUserProfile(data);
  }

  // 6. Загрузка аватара - пока заглушка
  async uploadAvatar(file: File): Promise<{ success: boolean; avatarUrl: string; message: string }> {
    try {
      const currentUser = await this.getCurrentUser();
      const userId: any = (currentUser as any)?.id || (currentUser as any)?.userId;
      if (!userId) {
        return { success: false, avatarUrl: '', message: 'Не удалось определить пользователя' };
      }
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${API_BASE_URL}/images/avatars/${userId}`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeaders()
        },
        body: formData
      });
      if (response.status === 429) {
        return { success: false, avatarUrl: '', message: 'Аватар можно менять раз в 24 часа' };
      }
      if (!response.ok) {
        return { success: false, avatarUrl: '', message: 'Ошибка загрузки аватара' };
      }
      const data = await response.json();
      return { success: true, avatarUrl: data.url || data.imageUrl || data.avatarUrl, message: 'Аватар обновлён' };
    } catch (e) {
      return { success: false, avatarUrl: '', message: 'Сбой загрузки аватара' };
    }
  }

  // Получить метаданные аватара пользователя (imageUrl) если есть
  async getUserAvatar(userId: number): Promise<string | null> {
    try {
      const res = await this.request<any>(`/images/avatars/${userId}`)
      const url = res?.imageUrl || res?.url || res?.avatarUrl
      return url || null
    } catch (e) {
      return null
    }
  }

  // 7. Статистика чтения (используем существующий API)
  async getProfileStatistics(): Promise<{
    totalReadingTimeMinutes: number;
    totalMangaRead: number;
    totalChaptersRead: number;
    favoriteGenres: string[];
    readingStreak: number;
    averageRating: number;
  }> {
    try {
      const stats = await this.request<any>('/auth/progress/stats');
      return {
        totalReadingTimeMinutes: stats.totalReadingTimeMinutes || 0,
        totalMangaRead: stats.totalMangaRead || 0,
        totalChaptersRead: stats.totalChaptersRead || 0,
        favoriteGenres: stats.favoriteGenres || [],
        readingStreak: stats.readingStreak || 0,
        averageRating: stats.averageRating || 0
      };
    } catch (error) {
      return {
        totalReadingTimeMinutes: 0,
        totalMangaRead: 0,
        totalChaptersRead: 0,
        favoriteGenres: [],
        readingStreak: 0,
        averageRating: 0
      };
    }
  }

  // Posts API (frontend scaffold – backend must implement corresponding endpoints)
  async getUserPosts(userId: number, page = 0, size = 10) {
    return this.request<any>(`/posts?userId=${userId}&page=${page}&size=${size}`);
  }

  async getPostById(postId: string) {
    return this.request<any>(`/posts/${postId}`);
  }

  async createPost(data: { content: string; attachments?: { filename: string; url: string; sizeBytes: number; }[] }) {
    return this.request<any>(`/posts`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updatePost(postId: string, data: { content: string; attachments?: { filename: string; url: string; sizeBytes: number; }[] }) {
    return this.request<any>(`/posts/${postId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deletePost(postId: string) {
    return this.request<void>(`/posts/${postId}`, { method: 'DELETE' });
  }

  async votePost(postId: string, value: 1 | -1 | 0) {
    return this.request<any>(`/posts/${postId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ value })
    });
  }

  // 8. Лента активности - пока заглушка
  async getProfileActivity(_userId?: number, _limit?: number): Promise<any[]> {
    console.warn('Лента активности пока не реализована на бэкенде');
    return [];
  }

  // Reading Progress API (исправленные пути)
  async getUserReadingStats(): Promise<any> {
    return this.request<any>(`/auth/progress/stats`);
  }

  async getUserProgress(): Promise<any[]> {
    return this.request<any[]>(`/auth/progress`);
  }

  // Утилитарный метод для получения URL изображения через прокси
  getImageUrl(imageKey: string): string {
    return `${API_BASE_URL}/images/proxy/${imageKey}`;
  }

  // Comments API - методы для работы с комментариями
  async getCommentById(commentId: number): Promise<any> {
    return this.request<any>(`/comments/${commentId}`);
  }

  async getCommentReplies(parentCommentId: number, page = 0, size = 10): Promise<any[]> {
    return this.request<any[]>(`/comments/${parentCommentId}/replies?page=${page}&size=${size}`);
  }

  async getUserComments(userId: number): Promise<any[]> {
    return this.request<any[]>(`/comments/user/${userId}`);
  }

  async createComment(data: {
    content: string;
    commentType: 'MANGA' | 'CHAPTER' | 'PROFILE' | 'REVIEW' | 'POST';
    targetId: number;
    parentCommentId?: number;
  }): Promise<any> {
    return this.request<any>('/comments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateComment(commentId: number, content: string): Promise<any> {
    return this.request<any>(`/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteComment(commentId: number): Promise<void> {
    await this.request<void>(`/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  async addCommentReaction(commentId: number, reactionType: 'LIKE' | 'DISLIKE'): Promise<void> {
    await this.request<void>(`/comments/${commentId}/reactions?reactionType=${reactionType}`, {
      method: 'POST',
    });
  }

  async getCommentReactions(commentId: number): Promise<any> {
    return this.request<any>(`/comments/${commentId}/reactions`);
  }

  // Admin API - методы для администрирования пользователей
  async getAdminUsers(params: AdminUsersParams): Promise<AdminUsersPageResponse> {
    const searchParams = new URLSearchParams({
      page: params.page.toString(),
      size: params.size.toString(),
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      query: params.query,
      role: params.role
    });
    
    return this.request<AdminUsersPageResponse>(`/admin/util/users/sortable?${searchParams}`);
  }

  async getAdminUsersCount(): Promise<number> {
    return this.request<number>('/admin/util/users-count');
  }

  async getAdminUserStats(): Promise<{
    totalUsers: number; translators: number; admins: number; banned: number; activeLast7Days: number;
  }> {
    return this.request('/admin/util/users-stats')
  }

  async getAdminLogsPaged(params: { page:number; size:number; sortBy:string; sortOrder:string; admin?:string; target?:string; action?:string }): Promise<{
    content: AdminActionLogDTO[]; totalElements:number; totalPages:number; number:number; size:number;
  }> {
    const sp = new URLSearchParams({
      page: String(params.page),
      size: String(params.size),
      sortBy: params.sortBy,
      sortOrder: params.sortOrder
    })
    if (params.admin) sp.set('admin', params.admin)
    if (params.target) sp.set('target', params.target)
    if (params.action) sp.set('action', params.action)
    return this.request(`/admin/util/logs/paged?${sp.toString()}`)
  }

  async toggleUserBanStatus(userId: number, adminId: number, reason: string): Promise<void> {
    const params = new URLSearchParams({
      userId: userId.toString(),
      adminId: adminId.toString(),
      reason: reason
    });
    
    await this.request<void>(`/admin/util/ban-toggle?${params}`, {
      method: 'PUT',
    });
  }

  // New structured ban endpoint supporting banType, expiry and structured reason fields
  async applyBan(data: {
    userId: number
    adminId: number
    banType: 'PERM' | 'TEMP' | 'SHADOW'
    banExpiresAt?: string | null
    reasonCode: string
    reasonDetails: string
    diff?: Array<{ field: string; old: any; new: any }>
    meta?: Record<string, any>
    legacyReason?: string // for backward compatibility logging
  }): Promise<void> {
    await this.request<void>('/admin/util/ban', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  async changeUserRole(userId: number, adminId: number, role: string, reason: string): Promise<void> {
    const params = new URLSearchParams({
      adminId: adminId.toString(),
      reason: reason,
      role: role
    });
    
    console.log('Changing user role:', { userId, adminId, role, reason });
    
    await this.request<void>(`/admin/util/users/${userId}/role?${params}`, {
      method: 'PUT',
    });
  }

  async getAdminLogs(): Promise<AdminActionLogDTO[]> {
    return this.request<AdminActionLogDTO[]>('/admin/util/logs');
  }

  // Инвалидация активных сессий пользователя (требуется backend endpoint). Пытаемся несколько путей.
  async invalidateUserSessions(userId: number): Promise<boolean> {
    // Primary (предполагаемый) endpoint
    const candidates = [
      `/admin/util/users/${userId}/sessions/invalidate`,
      `/admin/util/sessions/invalidate?userId=${userId}`,
      `/admin/sessions/invalidate?userId=${userId}`
    ]
    for (const ep of candidates) {
      try {
        await this.request<void>(ep, { method: 'POST' })
        return true
      } catch (e) {
        // silent continue
      }
    }
    return false
  }

  // =============================
  // Friend Service integrations
  // =============================

  async getFriendSummary(): Promise<FriendSummary> {
    return this.request<FriendSummary>('/friends/summary');
  }

  async getMyFriends(): Promise<FriendDto[]> {
    return this.request<FriendDto[]>('/friends');
  }

  async getFriendsOfUser(userId: number): Promise<FriendDto[]> {
    return this.request<FriendDto[]>(`/friends/users/${userId}`);
  }

  async getIncomingFriendRequests(): Promise<FriendRequestView[]> {
    return this.request<FriendRequestView[]>('/friends/requests/incoming');
  }

  async getOutgoingFriendRequests(): Promise<FriendRequestView[]> {
    return this.request<FriendRequestView[]>('/friends/requests/outgoing');
  }

  async createFriendRequest(payload: { targetUserId: number; message?: string }): Promise<FriendRequestView> {
    return this.request<FriendRequestView>('/friends/requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async acceptFriendRequest(requestId: string): Promise<FriendRequestView> {
    return this.request<FriendRequestView>(`/friends/requests/${requestId}/accept`, {
      method: 'POST',
    });
  }

  async declineFriendRequest(requestId: string): Promise<FriendRequestView> {
    return this.request<FriendRequestView>(`/friends/requests/${requestId}/decline`, {
      method: 'POST',
    });
  }

  async removeFriend(friendUserId: number): Promise<void> {
    await this.request<void>(`/friends/${friendUserId}`, { method: 'DELETE' });
  }

  // =============================
  // Messaging Service integrations
  // =============================

  async getInboxSummary(): Promise<InboxSummaryView> {
    return this.request<InboxSummaryView>('/messages/summary');
  }

  async listConversations(page = 0, size = 20): Promise<ConversationDto[]> {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    return this.request<ConversationDto[]>(`/messages/conversations?${params}`);
  }

  async createConversation(targetUserId: number): Promise<ConversationDto> {
    return this.request<ConversationDto>('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ targetUserId }),
    });
  }

  async getConversationMessages(
    conversationId: string,
    params?: { before?: string; after?: string; size?: number }
  ): Promise<MessagePageDto> {
    const searchParams = new URLSearchParams();
    if (params?.before) searchParams.set('before', params.before);
    if (params?.after) searchParams.set('after', params.after);
    if (params?.size) searchParams.set('size', String(params.size));
    const query = searchParams.toString();
    const suffix = query ? `?${query}` : '';
    return this.request<MessagePageDto>(`/messages/conversations/${conversationId}/messages${suffix}`);
  }

  async sendConversationMessage(
    conversationId: string,
    content: string,
    replyToMessageId?: string
  ): Promise<MessageDto> {
    const body: Record<string, any> = { content };
    if (replyToMessageId) {
      body.replyToMessageId = replyToMessageId;
    }
    return this.request<MessageDto>(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async markConversationRead(conversationId: string, lastMessageId: string): Promise<void> {
    await this.request<void>(`/messages/conversations/${conversationId}/read`, {
      method: 'POST',
      body: JSON.stringify({ lastMessageId }),
    });
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await this.request<void>(`/messages/conversations/${conversationId}`, {
      method: 'DELETE',
    });
  }

  async listChatCategories(includeArchived = false): Promise<CategoryView[]> {
    const params = new URLSearchParams();
    if (includeArchived) {
      params.set('includeArchived', 'true');
    }
    const query = params.toString();
    const suffix = query ? `?${query}` : '';
    return this.request<CategoryView[]>(`/messages/categories${suffix}`);
  }

  async getCategoryUnreadMap(): Promise<CategoryUnreadMap> {
    return this.request<CategoryUnreadMap>('/messages/categories/unread');
  }

  async getCategoryMessages(
    categoryId: number,
    params?: { before?: string; after?: string; size?: number }
  ): Promise<MessagePageDto> {
    const searchParams = new URLSearchParams();
    if (params?.before) searchParams.set('before', params.before);
    if (params?.after) searchParams.set('after', params.after);
    if (params?.size) searchParams.set('size', String(params.size));
    const query = searchParams.toString();
    const suffix = query ? `?${query}` : '';
    return this.request<MessagePageDto>(`/messages/categories/${categoryId}/messages${suffix}`);
  }

  async sendCategoryMessage(
    categoryId: number,
    content: string,
    replyToMessageId?: string | null
  ): Promise<MessageDto> {
    const payload: Record<string, any> = { content };
    if (replyToMessageId) {
      payload.replyToMessageId = replyToMessageId;
    }
    return this.request<MessageDto>(`/messages/categories/${categoryId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async markCategoryRead(categoryId: number, lastMessageId: string): Promise<void> {
    await this.request<void>(`/messages/categories/${categoryId}/read`, {
      method: 'POST',
      body: JSON.stringify({ lastMessageId }),
    });
  }

  async createChatCategory(payload: CreateCategoryPayload): Promise<CategoryView> {
    const body: Record<string, any> = { title: payload.title };
    if (payload.slug !== undefined) body.slug = payload.slug;
    if (payload.description !== undefined) body.description = payload.description;
    if (payload.isDefault !== undefined) body.isDefault = payload.isDefault;
    return this.request<CategoryView>('/messages/categories', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async updateChatCategory(categoryId: number, payload: UpdateCategoryPayload): Promise<CategoryView> {
    const body: Record<string, any> = {};
    if (payload.title !== undefined) body.title = payload.title;
    if (payload.description !== undefined) body.description = payload.description;
    if (payload.isArchived !== undefined) body.isArchived = payload.isArchived;
    if (payload.isDefault !== undefined) body.isDefault = payload.isDefault;
    return this.request<CategoryView>(`/messages/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }
}

export const apiClient = new ApiClient();
