import { apiClient } from '@/lib/api';
import { authService } from '@/services/authService';
import { bookmarkService } from '@/services/bookmarkService';
import { getUserProgress } from '@/services/progressService';
import { User, Bookmark, ReadingProgress } from '@/types';
import {
  ProfileDataResponse,
  FavoriteManga,
  UserReadingProgress,
  UserCollection,
  UserActivity,
  Achievement
} from '@/types/profile';

// Импортируем новые сервисы
import { favoritesService } from './favoritesService';
import { collectionService } from './collectionService';
import { readingProgressService } from './readingProgressService';
import { reviewsService } from './reviewsService';
import { extendedProfileService } from './extendedProfileService';

class ProfileService {
  // Получить данные профиля пользователя
  async getProfileData(userId: string): Promise<ProfileDataResponse> {
    try {
      // Получаем данные пользователя
      const user = await this.getUserById(userId);

      // Проверяем, это собственный профиль или чужой
      const currentUser = await authService.getCurrentUser().catch(() => null);
      const isOwnProfile = currentUser && currentUser.id.toString() === userId;

      let bookmarks: Bookmark[] = [];
      let readingProgress: ReadingProgress[] = [];
      let readingStats: any;

      // Получаем данные для профиля (и своего, и чужого)
      bookmarks = await this.getUserBookmarks(userId);
      readingProgress = await this.getUserReadingProgress(userId);
      // Если публичный прогресс недоступен (401) мы получим пустой массив.
      // В этом случае используем chaptersReadCount из публичного профиля, если он есть.
      readingStats = this.calculateReadingStats(bookmarks, readingProgress, user as any);
      if ((readingProgress.length === 0 || readingStats.totalChaptersRead === 0) && (user as any)?.chaptersReadCount) {
        readingStats.totalChaptersRead = (user as any).chaptersReadCount;
      }

      return {
        user,
        bookmarks,
        readingProgress,
        readingStats
      };
    } catch (error) {
      console.error('Ошибка при загрузке данных профиля:', error);
      throw error;
    }
  }

  // Получить пользователя по ID (исправлен под реальный API)
  private async getUserById(userId: string): Promise<User> {
    try {
      const userIdNumber = parseInt(userId);

      // Сначала проверяем, не запрашиваем ли мы текущего пользователя
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser.id.toString() === userId) {
          console.log('ProfileService: Returning current authenticated user');
          return currentUser;
        }
      } catch (currentUserError) {
        console.log('ProfileService: Not authenticated, will try public profile');
      }

      // Для другого пользователя используем публичный API
      console.log(`ProfileService: Fetching public profile for user ID: ${userIdNumber}`);
      return await apiClient.getUserPublicProfile(userIdNumber);
    } catch (error) {
      console.error(`ProfileService: Error getting user profile for ID ${userId}:`, error);
      throw new Error('Пользователь не найден');
    }
  }

  // Получить закладки пользователя
  private async getUserBookmarks(userId: string): Promise<Bookmark[]> {
    try {
      // Проверяем, это собственный профиль или чужой
      let isOwnProfile = false;
      try {
        const currentUser = await authService.getCurrentUser();
        isOwnProfile = currentUser.id.toString() === userId;
      } catch (error) {
        // Пользователь не авторизован, используем публичные методы
        isOwnProfile = false;
      }

      if (isOwnProfile) {
        // Для собственного профиля используем приватный API
        return await bookmarkService.getUserBookmarks();
      } else {
        // Для чужого профиля используем публичные закладки
        const userIdNumber = parseInt(userId);
        const user = await apiClient.getUserPublicProfile(userIdNumber);
        return await apiClient.getUserPublicBookmarks(user.username);
      }

    } catch (error) {
      console.error('Ошибка при загрузке закладок:', error);
      return [];
    }
  }

  // Получить прогресс чтения пользователя
  private async getUserReadingProgress(userId: string): Promise<ReadingProgress[]> {
    try {
      // Проверяем, это собственный профиль или чужой
      let isOwnProfile = false;
      try {
        const currentUser = await authService.getCurrentUser();
        isOwnProfile = currentUser.id.toString() === userId;
      } catch (error) {
        // Пользователь не авторизован, используем публичные методы
        isOwnProfile = false;
      }

      if (isOwnProfile) {
        // Для собственного профиля используем приватный API
        return await getUserProgress();
      } else {
        // Для чужого профиля используем публичный прогресс
        const userIdNumber = parseInt(userId);
        return await apiClient.getUserPublicProgress(userIdNumber);
      }
      
    } catch (error) {
      console.error('Ошибка при загрузке прогресса чтения:', error);
      return [];
    }
  }

  // Вычислить статистику чтения
  private calculateReadingStats(bookmarks: Bookmark[], readingProgress: ReadingProgress[], user?: { chaptersReadCount?: number }) {
    const totalMangaRead = bookmarks.filter(b => b.status === 'COMPLETED').length;

    // Расширенная логика подсчета прочитанных глав:
    // 1. Пробуем явный флаг isCompleted / completed / status === 'COMPLETED'
    let totalChaptersRead = readingProgress.filter(p => {
      const anyP: any = p as any;
      return p.isCompleted === true || anyP.completed === true || anyP.status === 'COMPLETED';
    }).length;

    // 2. Если ничего не нашли, но прогресс есть – используем количество записей как приближение
    if (totalChaptersRead === 0 && readingProgress.length > 0) {
      totalChaptersRead = readingProgress.length;
    }

    // 3. Если всё ещё 0 – fallback на публичное поле профиля (если бэкенд его прислал)
    if (totalChaptersRead === 0 && user?.chaptersReadCount && user.chaptersReadCount > 0) {
      totalChaptersRead = user.chaptersReadCount;
    }

    const totalPagesRead = readingProgress.reduce((sum, p) => sum + (p.pageNumber || 0), 0);

    // Вычисляем любимые жанры на основе закладок
    const genreCount: { [key: string]: number } = {};
    bookmarks.forEach(bookmark => {
      if (bookmark.manga?.genre) {
        const genres = bookmark.manga.genre.split(',').map(g => g.trim());
        genres.forEach(genre => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
        });
      }
    });

    const favoriteGenres = Object.entries(genreCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre);

    return {
      totalMangaRead,
      totalChaptersRead,
      totalPagesRead,
      favoriteGenres,
      readingStreak: 0 // TODO: Реализовать расчет streak
    };
  }

  // Преобразовать закладки в избранную мангу
  getFavoriteMangas(bookmarks: Bookmark[]): FavoriteManga[] {
    return bookmarks
      .filter(bookmark => bookmark.isFavorite && bookmark.manga)
      .map(bookmark => ({
        id: bookmark.manga!.id,
        title: bookmark.manga!.title,
        coverImage: bookmark.manga!.coverImageUrl,
        rating: 8.5, // TODO: Добавить систему рейтингов
        manga: bookmark.manga
      }));
  }

  // Преобразовать прогресс чтения в UserReadingProgress
  getReadingProgressData(readingProgress: ReadingProgress[]): UserReadingProgress[] {
    return readingProgress
      .filter(progress => !progress.isCompleted && progress.manga)
      .map(progress => {
        return {
          ...progress,
          title: progress.manga?.title || 'Неизвестная манга',
          coverImage: progress.manga?.coverImageUrl || '/icon.png',
          currentChapter: progress.chapterNumber || 1,
          totalChapters: progress.manga?.totalChapters || 1,
          lastRead: new Date(progress.updatedAt)
        };
      })
      .slice(0, 5);
  }

  // Создать коллекции на основе закладок
  getCollectionsFromBookmarks(bookmarks: Bookmark[]): UserCollection[] {
    const collections: UserCollection[] = [];

    // Группируем по статусам
    const statusGroups = {
      'READING': 'Читаю',
      'COMPLETED': 'Прочитано',
      'PLAN_TO_READ': 'В планах',
      'ON_HOLD': 'Отложено'
    };

    Object.entries(statusGroups).forEach(([status, name]) => {
      const statusBookmarks = bookmarks.filter(b => b.status === status);
      if (statusBookmarks.length > 0) {
        collections.push({
          id: `collection-${status}`,
          name,
          description: `Манга со статусом "${name}"`,
          mangaCount: statusBookmarks.length,
          coverImages: statusBookmarks
            .slice(0, 4)
            .map(b => b.manga?.coverImageUrl || '/icon.png'),
          isPublic: true,
          bookmarks: statusBookmarks
        });
      }
    });

    // Добавляем коллекцию избранного
    const favorites = bookmarks.filter(b => b.isFavorite);
    if (favorites.length > 0) {
      collections.unshift({
        id: 'collection-favorites',
        name: 'Избранное',
        description: 'Любимая манга',
        mangaCount: favorites.length,
        coverImages: favorites
          .slice(0, 4)
          .map(b => b.manga?.coverImageUrl || '/icon.png'),
        isPublic: true,
        bookmarks: favorites
      });
    }

    return collections;
  }

  // Генерировать активность пользователя на основе прогресса чтения
  generateUserActivity(readingProgress: ReadingProgress[], bookmarks: Bookmark[]): UserActivity[] {
    const activities: UserActivity[] = [];

    // Добавляем активность чтения
    readingProgress
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 10)
      .forEach(progress => {
        if (progress.manga) {
          const title = progress.manga?.title || progress.mangaTitle || 'Неизвестная манга';
          activities.push({
            id: `activity-read-${progress.id}`,
            type: 'read',
            description: `Прочитал главу ${progress.chapterNumber || 1} "${title}"`,
            timestamp: new Date(progress.updatedAt),
            relatedMangaId: progress.mangaId,
            mangaTitle: title !== 'манги' ? title : undefined,
            chapterNumber: progress.chapterNumber ? Number(progress.chapterNumber) : undefined,
            chapterId: progress.chapterId
          });
        }
      });

    // Добавляем активность закладок
    bookmarks
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5)
      .forEach(bookmark => {
        if (bookmark.manga) {
          const statusText = {
            'READING': 'начал читать',
            'COMPLETED': 'завершил',
            'PLAN_TO_READ': 'добавил в планы',
            'ON_HOLD': 'отложил',
            'DROPPED': 'бросил'
          }[bookmark.status] || 'изменил статус';

          const title = bookmark.manga?.title || bookmark.mangaTitle || 'Неизвестная манга';
          activities.push({
            id: `activity-bookmark-${bookmark.id}`,
            type: 'bookmark',
            description: `${statusText} "${title}"`,
            timestamp: new Date(bookmark.updatedAt),
            relatedMangaId: bookmark.mangaId
          });
        }
      });

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 15);
  }

  // Генерировать достижения на основе статистики
  generateAchievements(stats: any): Achievement[] {
    const achievements: Achievement[] = [];

    if (stats.totalMangaRead >= 1) {
      achievements.push({
        id: 'first-manga',
        name: 'Первые шаги',
        description: 'Прочитали первую мангу',
        icon: '📖',
        unlockedAt: new Date(),
        rarity: 'common'
      });
    }

    if (stats.totalMangaRead >= 10) {
      achievements.push({
        id: 'manga-reader',
        name: 'Читатель',
        description: 'Прочитали 10 манг',
        icon: '📚',
        unlockedAt: new Date(),
        rarity: 'common'
      });
    }

    if (stats.totalMangaRead >= 50) {
      achievements.push({
        id: 'manga-enthusiast',
        name: 'Энтузиаст',
        description: 'Прочитали 50 манг',
        icon: '🌟',
        unlockedAt: new Date(),
        rarity: 'rare'
      });
    }

    if (stats.totalChaptersRead >= 100) {
      achievements.push({
        id: 'chapter-marathon',
        name: 'Марафонец',
        description: 'Прочитали 100 глав',
        icon: '🏃',
        unlockedAt: new Date(),
        rarity: 'rare'
      });
    }

    if (stats.totalChaptersRead >= 500) {
      achievements.push({
        id: 'chapter-master',
        name: 'Мастер чтения',
        description: 'Прочитали 500 глав',
        icon: '👑',
        unlockedAt: new Date(),
        rarity: 'epic'
      });
    }

    return achievements;
  }

  // НОВЫЕ МЕТОДЫ ДЛЯ КРИТИЧЕСКИ ВАЖНОГО ФУНКЦИОНАЛА

  /**
   * Обновить список избранных манга
   */
  async updateFavorites(mangaIds: number[]): Promise<{ success: boolean; message: string }> {
    return favoritesService.updateFavorites(mangaIds);
  }

  /**
   * Добавить мангу в избранное
   */
  async addToFavorites(mangaId: number): Promise<{ success: boolean; message: string }> {
    return favoritesService.addToFavorites(mangaId);
  }

  /**
   * Удалить мангу из избранного
   */
  async removeFromFavorites(mangaId: number): Promise<{ success: boolean; message: string }> {
    return favoritesService.removeFromFavorites(mangaId);
  }

  /**
   * Переключить статус избранного
   */
  async toggleFavorite(mangaId: number): Promise<{ success: boolean; message: string; isFavorite: boolean }> {
    return favoritesService.toggleFavorite(mangaId);
  }

  /**
   * Создать новую коллекцию
   */
  async createCollection(data: { name: string; description?: string; isPublic?: boolean; mangaIds?: number[] }) {
    return collectionService.createCollection(data);
  }

  /**
   * Обновить существующую коллекцию
   */
  async updateCollection(id: string, data: { name?: string; description?: string; isPublic?: boolean; mangaIds?: number[] }) {
    return collectionService.updateCollection(id, data);
  }

  /**
   * Удалить коллекцию
   */
  async deleteCollection(id: string): Promise<{ success: boolean; message: string }> {
    return collectionService.deleteCollection(id);
  }

  /**
   * Получить коллекции пользователя
   */
  async getUserCollections(): Promise<UserCollection[]> {
    return collectionService.getUserCollections();
  }

  /**
   * Обновить прогресс чтения
   */
  async updateReadingProgress(mangaId: number, data: {
    chapterNumber: number;
    pageNumber?: number;
    status?: 'READING' | 'COMPLETED' | 'ON_HOLD' | 'DROPPED' | 'PLAN_TO_READ';
    isCompleted?: boolean;
  }) {
    return readingProgressService.updateReadingProgress(mangaId, data);
  }

  /**
   * Отметить главу как прочитанную
   */
  async markChapterAsRead(mangaId: number, chapterNumber: number): Promise<{ success: boolean; message: string }> {
    return readingProgressService.markChapterAsRead(mangaId, chapterNumber);
  }

  /**
   * Отметить мангу как завершенную
   */
  async markMangaAsCompleted(mangaId: number): Promise<{ success: boolean; message: string }> {
    return readingProgressService.markMangaAsCompleted(mangaId);
  }

  /**
   * Создать новый отзыв
   */
  async createReview(data: {
    mangaId: number;
    rating: number;
    text: string;
    spoilerWarning?: boolean;
  }) {
    return reviewsService.createReview(data);
  }

  /**
   * Обновить существующий отзыв
   */
  async updateReview(reviewId: string, data: {
    rating?: number;
    text?: string;
    spoilerWarning?: boolean;
  }) {
    return reviewsService.updateReview(reviewId, data);
  }

  /**
   * Удалить отзыв
   */
  async deleteReview(reviewId: string): Promise<{ success: boolean; message: string }> {
    return reviewsService.deleteReview(reviewId);
  }

  /**
   * Получить отзывы пользователя
   */
  async getUserReviews(userId?: number) {
    return reviewsService.getUserReviews(userId);
  }

  /**
   * Обновить настройки профиля
   */
  async updateProfileSettings(data: {
    displayName?: string;
    bio?: string;
    backgroundImage?: string;
    socialLinks?: any;
    privacySettings?: any;
  }) {
    return extendedProfileService.updateProfileSettings(data);
  }

  /**
   * Загрузить аватар
   */
  async uploadAvatar(file: File): Promise<{ success: boolean; avatarUrl: string; message: string }> {
    return extendedProfileService.uploadAvatar(file);
  }

  /**
   * Получить статистику профиля
   */
  async getProfileStatistics() {
    return extendedProfileService.getProfileStatistics();
  }

  /**
   * Получить активность профиля
   */
  async getProfileActivity(userId?: number, limit?: number) {
    return extendedProfileService.getProfileActivity(userId, limit);
  }

  // ОБНОВЛЕННЫЕ СУЩЕСТВУЮЩИЕ МЕТОДЫ

  /**
   * Получить избранную мангу с использованием нового API
   */
  async getFavoriteMangasUpdated(): Promise<FavoriteManga[]> {
    try {
      return await favoritesService.getFavorites();
    } catch (error) {
      console.error('Ошибка при получении избранного:', error);
      return [];
    }
  }

  /**
   * Получить прогресс чтения с использованием нового API
   */
  async getReadingProgressUpdated(): Promise<UserReadingProgress[]> {
    try {
      return await readingProgressService.getUserProgress();
    } catch (error) {
      console.error('Ошибка при получении прогресса чтения:', error);
      return [];
    }
  }

  /**
   * Получить коллекции с использованием нового API
   */
  async getCollectionsUpdated(): Promise<UserCollection[]> {
    try {
      return await collectionService.getUserCollections();
    } catch (error) {
      console.error('Ошибка при получении коллекций:', error);
      return [];
    }
  }
}

export const profileService = new ProfileService();
