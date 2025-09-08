import { apiClient } from '@/lib/api';
import { UserActivity, Achievement } from '@/types/profile';

export interface ProfileSettingsData {
  displayName?: string;
  bio?: string;
  backgroundImage?: string;
  socialLinks?: {
    twitter?: string;
    discord?: string;
    telegram?: string;
    vk?: string;
  };
  privacySettings?: {
    showActivity?: boolean;
    showFavorites?: boolean;
    showProgress?: boolean;
    allowMessages?: boolean;
  };
}

export interface ProfileStatistics {
  totalReadingTimeMinutes: number;
  totalMangaRead: number;
  totalChaptersRead: number;
  favoriteGenres: string[];
  readingStreak: number;
  averageRating: number;
}

class ExtendedProfileService {
  /**
   * Обновить настройки профиля
   */
  async updateProfileSettings(data: ProfileSettingsData): Promise<any> {
    try {
      return await apiClient.updateProfileSettings(data);
    } catch (error) {
      console.error('Ошибка при обновлении настроек профиля:', error);
      throw new Error('Не удалось обновить настройки профиля');
    }
  }

  /**
   * Загрузить новый аватар
   */
  async uploadAvatar(file: File): Promise<{ success: boolean; avatarUrl: string; message: string }> {
    try {
      // Проверяем размер файла (максимум 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Размер файла не должен превышать 5MB');
      }

      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        throw new Error('Можно загружать только изображения');
      }

      // Проверяем формат файла
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Поддерживаются только форматы: JPEG, PNG, WebP');
      }

      return await apiClient.uploadAvatar(file);
    } catch (error) {
      console.error('Ошибка при загрузке аватара:', error);
      throw error instanceof Error ? error : new Error('Не удалось загрузить аватар');
    }
  }

  /**
   * Получить статистику профиля
   */
  async getProfileStatistics(): Promise<ProfileStatistics> {
    try {
      // Используем новое Auth API для получения статистики
      const { authService } = await import('./authServiceExtended');
      const stats = await authService.getReadingStatistics();
      
      return {
        totalReadingTimeMinutes: stats.totalReadingTimeMinutes || 0,
        totalMangaRead: stats.totalMangaRead || 0,
        totalChaptersRead: stats.totalChaptersRead || 0,
        favoriteGenres: stats.favoriteGenres || [],
        readingStreak: stats.readingStreak || 0,
        averageRating: stats.averageRating || 0
      };
    } catch (error) {
      console.error('Ошибка при получении статистики профиля:', error);
      throw new Error('Не удалось загрузить статистику');
    }
  }

  /**
   * Получить ленту активности профиля
   */
  async getProfileActivity(userId?: number, limit: number = 10): Promise<UserActivity[]> {
    try {
      // Используем новое Auth API для получения активности
      const { authService } = await import('./authServiceExtended');
      
      if (!userId) {
        throw new Error('ID пользователя обязателен для получения активности');
      }

      const activities = await authService.getUserActivity(userId, limit);
      
      return activities.map(activity => ({
        id: activity.id.toString(),
        type: this.mapActivityType(activity.activityType),
        description: activity.message,
        timestamp: new Date(activity.timestamp),
        relatedMangaId: activity.mangaId
      }));
    } catch (error) {
      console.error('Ошибка при получении активности профиля:', error);
      throw new Error('Не удалось загрузить активность');
    }
  }

  /**
   * Получить активность чтения пользователя
   */
  async getReadingActivity(userId: number, limit: number = 10): Promise<UserActivity[]> {
    try {
      const { authService } = await import('./authServiceExtended');
      const activities = await authService.getUserReadingActivity(userId, limit);
      
      return activities.map(activity => ({
        id: activity.id.toString(),
        type: 'read',
        description: activity.message,
        timestamp: new Date(activity.timestamp),
        relatedMangaId: activity.mangaId
      }));
    } catch (error) {
      console.error('Ошибка при получении активности чтения:', error);
      throw new Error('Не удалось загрузить активность чтения');
    }
  }

  /**
   * Получить активность отзывов пользователя
   */
  async getReviewActivity(userId: number, limit: number = 10): Promise<UserActivity[]> {
    try {
      const { authService } = await import('./authServiceExtended');
      const activities = await authService.getUserReviewActivity(userId, limit);
      
      return activities.map(activity => ({
        id: activity.id.toString(),
        type: 'review',
        description: activity.message,
        timestamp: new Date(activity.timestamp),
        relatedMangaId: activity.mangaId
      }));
    } catch (error) {
      console.error('Ошибка при получении активности отзывов:', error);
      throw new Error('Не удалось загрузить активность отзывов');
    }
  }

  /**
   * Маппинг типов активности из API в типы приложения
   */
  private mapActivityType(apiType: string): 'read' | 'review' | 'bookmark' | 'achievement' {
    switch (apiType.toLowerCase()) {
      case 'reading':
      case 'read':
      case 'chapter_read':
        return 'read';
      case 'review':
      case 'review_created':
      case 'review_updated':
        return 'review';
      case 'bookmark':
      case 'bookmark_added':
      case 'bookmark_updated':
        return 'bookmark';
      case 'achievement':
      case 'level_up':
        return 'achievement';
      default:
        return 'read'; // по умолчанию
    }
  }

  /**
   * Обновить отображаемое имя
   */
  async updateDisplayName(displayName: string): Promise<any> {
    try {
      if (!displayName.trim()) {
        throw new Error('Отображаемое имя не может быть пустым');
      }

      if (displayName.length > 50) {
        throw new Error('Отображаемое имя не может содержать более 50 символов');
      }

      return await this.updateProfileSettings({ displayName: displayName.trim() });
    } catch (error) {
      console.error('Ошибка при обновлении отображаемого имени:', error);
      throw error instanceof Error ? error : new Error('Не удалось обновить отображаемое имя');
    }
  }

  /**
   * Обновить описание профиля
   */
  async updateBio(bio: string): Promise<any> {
    try {
      if (bio.length > 500) {
        throw new Error('Описание не может содержать более 500 символов');
      }

      return await this.updateProfileSettings({ bio: bio.trim() });
    } catch (error) {
      console.error('Ошибка при обновлении описания:', error);
      throw error instanceof Error ? error : new Error('Не удалось обновить описание');
    }
  }

  /**
   * Обновить социальные ссылки
   */
  async updateSocialLinks(socialLinks: ProfileSettingsData['socialLinks']): Promise<any> {
    try {
      // Валидируем URL-ы
      if (socialLinks) {
        const urlPattern = /^https?:\/\/.+/;

        Object.entries(socialLinks).forEach(([platform, url]) => {
          if (url && !urlPattern.test(url)) {
            throw new Error(`Некорректная ссылка для ${platform}`);
          }
        });
      }

      return await this.updateProfileSettings({ socialLinks });
    } catch (error) {
      console.error('Ошибка при обновлении социальных ссылок:', error);
      throw error instanceof Error ? error : new Error('Не удалось обновить социальные ссылки');
    }
  }

  /**
   * Обновить настройки приватности
   */
  async updatePrivacySettings(privacySettings: ProfileSettingsData['privacySettings']): Promise<any> {
    try {
      return await this.updateProfileSettings({ privacySettings });
    } catch (error) {
      console.error('Ошибка при обновлении настроек приватности:', error);
      throw new Error('Не удалось обновить настройки приватности');
    }
  }

  /**
   * Получить форматированную статистику для отображения
   */
  async getFormattedStatistics(): Promise<{
    readingTime: string;
    mangaCount: number;
    chaptersCount: number;
    favoriteGenres: string[];
    streak: number;
    averageRating: string;
  }> {
    try {
      const stats = await this.getProfileStatistics();

      // Форматируем время чтения
      const hours = Math.floor(stats.totalReadingTimeMinutes / 60);
      const minutes = stats.totalReadingTimeMinutes % 60;
      const readingTime = hours > 0 ? `${hours}ч ${minutes}мин` : `${minutes}мин`;

      return {
        readingTime,
        mangaCount: stats.totalMangaRead,
        chaptersCount: stats.totalChaptersRead,
        favoriteGenres: stats.favoriteGenres.slice(0, 3), // Показываем топ-3 жанра
        streak: stats.readingStreak,
        averageRating: stats.averageRating.toFixed(1)
      };
    } catch (error) {
      console.error('Ошибка при форматировании статистики:', error);
      return {
        readingTime: '0мин',
        mangaCount: 0,
        chaptersCount: 0,
        favoriteGenres: [],
        streak: 0,
        averageRating: '0.0'
      };
    }
  }

  /**
   * Получить последнюю активность пользователя
   */
  async getRecentActivity(limit: number = 5): Promise<UserActivity[]> {
    try {
      return await this.getProfileActivity(undefined, limit);
    } catch (error) {
      console.error('Ошибка при получении последней активности:', error);
      return [];
    }
  }

  /**
   * Проверить, можно ли загрузить файл как аватар
   */
  validateAvatarFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      errors.push('Размер файла не должен превышать 5MB');
    }

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      errors.push('Можно загружать только изображения');
    }

    // Проверяем формат файла
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      errors.push('Поддерживаются только форматы: JPEG, PNG, WebP');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Валидировать настройки профиля
   */
  validateProfileSettings(data: ProfileSettingsData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.displayName !== undefined) {
      if (!data.displayName.trim()) {
        errors.push('Отображаемое имя не может быть пустым');
      } else if (data.displayName.length > 50) {
        errors.push('Отображаемое имя не может содержать более 50 символов');
      }
    }

    if (data.bio !== undefined && data.bio.length > 500) {
      errors.push('Описание не может содержать более 500 символов');
    }

    if (data.socialLinks) {
      const urlPattern = /^https?:\/\/.+/;

      Object.entries(data.socialLinks).forEach(([platform, url]) => {
        if (url && !urlPattern.test(url)) {
          errors.push(`Некорректная ссылка для ${platform}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Получить рекомендации по улучшению профиля
   */
  async getProfileCompletionTips(): Promise<string[]> {
    try {
      const stats = await this.getProfileStatistics();
      const tips: string[] = [];

      if (stats.totalMangaRead === 0) {
        tips.push('Добавьте мангу в свою библиотеку');
      }

      if (stats.favoriteGenres.length === 0) {
        tips.push('Отметьте несколько манга как избранные, чтобы мы могли определить ваши любимые жанры');
      }

      // Можно добавить больше рекомендаций на основе статистики

      return tips;
    } catch (error) {
      console.error('Ошибка при получении рекомендаций:', error);
      return [];
    }
  }
}

export const extendedProfileService = new ExtendedProfileService();
