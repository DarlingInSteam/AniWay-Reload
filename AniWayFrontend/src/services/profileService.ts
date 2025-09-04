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

class ProfileService {
  // Получить данные профиля пользователя
  async getProfileData(userId: string): Promise<ProfileDataResponse> {
    try {
      // Получаем данные пользователя
      const user = await this.getUserById(userId);

      // Получаем закладки пользователя
      const bookmarks = await this.getUserBookmarks(userId);

      // Получаем прогресс чтения
      const readingProgress = await this.getUserReadingProgress(userId);

      // Формируем статистику чтения
      const readingStats = this.calculateReadingStats(bookmarks, readingProgress);

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

  // Получить пользователя по ID
  private async getUserById(userId: string): Promise<User> {
    try {
      const userIdNumber = parseInt(userId);

      // Попробуем получить публичный профиль пользователя
      return await apiClient.getUserPublicProfile(userIdNumber);
    } catch (error) {
      // Если не удалось получить профиль другого пользователя,
      // проверяем, возможно это текущий пользователь
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser.id.toString() === userId) {
          return currentUser;
        }
      } catch (currentUserError) {
        console.error('Ошибка получения текущего пользователя:', currentUserError);
      }

      throw new Error('Пользователь не найден');
    }
  }

  // Получить закладки пользователя
  private async getUserBookmarks(userId: string): Promise<Bookmark[]> {
    try {
      // Для собственного профиля используем приватный API
      const currentUser = await authService.getCurrentUser();
      if (currentUser.id.toString() === userId) {
        return await bookmarkService.getUserBookmarks();
      }

      // Для чужого профиля пытаемся получить публичные закладки
      // TODO: Реализовать API для публичных закладок
      console.log('Получение публичных закладок пока не реализовано');
      return [];
    } catch (error) {
      console.error('Ошибка при загрузке закладок:', error);
      return [];
    }
  }

  // Получить прогресс чтения пользователя
  private async getUserReadingProgress(userId: string): Promise<ReadingProgress[]> {
    try {
      // Для собственного профиля используем приватный API
      const currentUser = await authService.getCurrentUser();
      if (currentUser.id.toString() === userId) {
        return await getUserProgress();
      }

      // Для чужого профиля прогресс чтения не показываем (приватная информация)
      return [];
    } catch (error) {
      console.error('Ошибка при загрузке прогресса чтения:', error);
      return [];
    }
  }

  // Вычислить статистику чтения
  private calculateReadingStats(bookmarks: Bookmark[], readingProgress: ReadingProgress[]) {
    const totalMangaRead = bookmarks.filter(b => b.status === 'COMPLETED').length;
    const totalChaptersRead = readingProgress.filter(p => p.isCompleted).length;
    const totalPagesRead = readingProgress.reduce((sum, p) => sum + p.pageNumber, 0);

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
  getReadingProgressData(readingProgress: ReadingProgress[], bookmarks: Bookmark[]): UserReadingProgress[] {
    return readingProgress
      .filter(progress => !progress.isCompleted && progress.manga)
      .map(progress => {
        const bookmark = bookmarks.find(b => b.mangaId === progress.mangaId);
        return {
          ...progress,
          title: progress.manga?.title || 'Неизвестная манга',
          coverImage: progress.manga?.coverImageUrl || '/placeholder-manga.png',
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
            .map(b => b.manga?.coverImageUrl || '/placeholder-manga.png'),
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
          .map(b => b.manga?.coverImageUrl || '/placeholder-manga.png'),
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
          activities.push({
            id: `activity-read-${progress.id}`,
            type: 'read',
            description: `Прочитал главу ${progress.chapterNumber || 1} "${progress.manga.title}"`,
            timestamp: new Date(progress.updatedAt),
            relatedMangaId: progress.mangaId
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

          activities.push({
            id: `activity-bookmark-${bookmark.id}`,
            type: 'bookmark',
            description: `${statusText} "${bookmark.manga.title}"`,
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
}

export const profileService = new ProfileService();
