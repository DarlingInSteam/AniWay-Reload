import { MangaResponseDTO, ChapterDTO, ChapterImageDTO, SearchParams, UserSearchParams, UserSearchResult, User, UpdateProfileRequest, AdminUserData, AdminUserFilter, AdminUsersPageResponse, AdminUsersParams, AdminActionLogDTO } from '@/types';

const API_BASE_URL = '/api';

class ApiClient {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('authToken');

    console.log(`API Request: ${options?.method || 'GET'} ${url}`);
    console.log(`Auth token present: ${!!token}`);

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
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

  
  // Публичный запрос без авторизационных заголовков
  private async publicRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    console.log(`Public API Request: ${options?.method || 'GET'} ${url}`);

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    console.log(`Public API Response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Public API Error Details: ${errorText}`);
      throw new Error(`Public API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  // Manga API
  async getAllManga(): Promise<MangaResponseDTO[]> {
    return this.request<MangaResponseDTO[]>('/manga');
  }

  async getMangaById(id: number, userId?: number): Promise<MangaResponseDTO> {
    const params = new URLSearchParams();
    if (userId) {
      params.append('userId', userId.toString());
    }
    const queryString = params.toString();
    const endpoint = queryString ? `/manga/${id}?${queryString}` : `/manga/${id}`;
    return this.request<MangaResponseDTO>(endpoint);
  }

  async searchManga(params: SearchParams): Promise<MangaResponseDTO[]> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value);
    });

    return this.request<MangaResponseDTO[]>(`/manga/search?${searchParams}`);
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
    return this.request<ChapterDTO[]>(`/manga/${mangaId}/chapters`);
  }

  // Chapter API
  async getChapterById(id: number): Promise<ChapterDTO> {
    return this.request<ChapterDTO>(`/chapters/${id}`);
  }

  async getChaptersByManga(mangaId: number): Promise<ChapterDTO[]> {
    return this.request<ChapterDTO[]>(`/chapters/manga/${mangaId}`);
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
    return this.request<User>(`/auth/users/${userId}/public`);
  }

  // Обновить профиль текущего пользователя (deprecated - используйте updateUserProfile)
  async updateCurrentUserProfile(data: any): Promise<User> {
    return this.request<User>(`/auth/me`, {
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

  async getUserPublicProgress(userId: number): Promise<any[]> {
    try {
      return this.publicRequest<any[]>(`/auth/users/${userId}/public/progress`);
    } catch (error) {
      console.log(`Публичный прогресс недоступен для пользователя ${userId}`);
      return [];
    }
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
      const results = await Promise.all(
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

  async updateCollection(id: string, data: { name?: string; description?: string; isPublic?: boolean; mangaIds?: number[] }): Promise<any> {
    console.warn('Обновление коллекций пока не реализовано на бэкенде');
    return { success: true, message: 'Коллекция обновлена (заглушка)' };
  }

  async deleteCollection(id: string): Promise<{ success: boolean; message: string }> {
    console.warn('Удаление коллекций пока не реализовано на бэкенде');
    return { success: true, message: 'Коллекция удалена (заглушка)' };
  }

  async getUserCollections(): Promise<any[]> {
    // Возвращаем коллекции на основе статусов закладок
    try {
      const bookmarks = await this.getUserBookmarks();

      // Группируем по статусам как коллекции
      const collections = [
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

      return collections;
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

  async addMangaToCollection(collectionId: string, mangaId: number): Promise<{ success: boolean; message: string }> {
    console.warn('addMangaToCollection пока не реализован на бэкенде');
    // Заглушка - в будущем будет реальный API
    return { success: true, message: 'Манга добавлена в коллекцию (заглушка)' };
  }

  async removeMangaFromCollection(collectionId: string, mangaId: number): Promise<{ success: boolean; message: string }> {
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
    console.warn('Загрузка аватара пока не реализована на бэкенде');
    return {
      success: true,
      avatarUrl: '/placeholder-avatar.png',
      message: 'Аватар загружен (заглушка)'
    };
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

  // 8. Лента активности - пока заглушка
  async getProfileActivity(userId?: number, limit?: number): Promise<any[]> {
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
    commentType: 'MANGA' | 'CHAPTER' | 'PROFILE' | 'REVIEW';
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
}

export const apiClient = new ApiClient();
