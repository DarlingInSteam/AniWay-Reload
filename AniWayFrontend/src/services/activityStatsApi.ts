import { authService as extendedAuthService, ActivityDTO as BaseActivityDTO } from './authServiceExtended';
import { ActivityType, ProcessedActivityDTO, ProfileStatistics } from '../types/profile';
import { apiClient } from '@/lib/api';

// Реэкспортируем типы для удобства использования
export type { ActivityType, ProcessedActivityDTO, ProfileStatistics } from '../types/profile';

/**
 * API для работы с активностью и статистикой пользователя в блоке профиля "Активность"
 */
class ActivityAndStatsApiWrapper {
  /**
   * Получить все виды активности пользователя
   * Использует ActivityDTO из auth-service-api.yaml
   */
  async getUserActivity(userId: number, limit: number = 20): Promise<ProcessedActivityDTO[]> {
    try {
      const activities = await extendedAuthService.getUserActivity(userId, limit);
      return await this.processActivities(activities);
    } catch (error) {
      console.error('Ошибка получения активности пользователя:', error);
      throw error;
    }
  }

  /**
   * Получить только активность чтения пользователя (CHAPTER_COMPLETED)
   */
  async getUserReadingActivity(userId: number, limit: number = 20): Promise<ProcessedActivityDTO[]> {
    try {
      const activities = await extendedAuthService.getUserReadingActivity(userId, limit);
      return await this.processActivities(activities);
    } catch (error) {
      console.error('Ошибка получения активности чтения:', error);
      throw error;
    }
  }

  /**
   * Получить только активность отзывов пользователя (REVIEW_CREATED)
   */
  async getUserReviewActivity(userId: number, limit: number = 20): Promise<ProcessedActivityDTO[]> {
    try {
      const activities = await extendedAuthService.getUserReviewActivity(userId, limit);
      return await this.processActivities(activities);
    } catch (error) {
      console.error('Ошибка получения активности отзывов:', error);
      throw error;
    }
  }

  /**
   * Получить статистику чтения для профиля
   */
  async getReadingStatistics(): Promise<ProfileStatistics> {
    try {
      const stats = await extendedAuthService.getReadingStatistics();
      return {
        ...stats,
        hasActivity: (stats.totalMangaRead || 0) > 0 || (stats.totalChaptersRead || 0) > 0
      };
    } catch (error) {
      console.error('Ошибка получения статистики чтения:', error);
      throw error;
    }
  }

  /**
   * Обработка активностей с валидацией типов и генерацией сообщений для UI
   */
  private async processActivities(activities: BaseActivityDTO[]): Promise<ProcessedActivityDTO[]> {
    const processedActivities = await Promise.all(
      activities.map(activity => this.processActivity(activity))
    );
    return processedActivities.filter(activity => activity.isValid);
  }

  /**
   * Обработка одной активности с валидацией и форматированием
   */
  private async processActivity(activity: BaseActivityDTO): Promise<ProcessedActivityDTO> {
    let enhancedActivity = { ...activity };
    
    // Если есть mangaId, но нет mangaTitle, получаем название манги
    if (activity.mangaId) {
      try {
        const manga = await apiClient.getMangaById(activity.mangaId);
        enhancedActivity.mangaTitle = manga.title;
      } catch (error) {
        console.error(`Ошибка получения манги с ID ${activity.mangaId}:`, error);
        enhancedActivity.mangaTitle = 'Неизвестная манга';
      }
    }

    const processed: ProcessedActivityDTO = {
      ...enhancedActivity,
      activityType: enhancedActivity.activityType as ActivityType,
      isValid: this.isValidActivityType(enhancedActivity.activityType),
      displayTime: this.formatActivityTime(enhancedActivity.timestamp),
      displayMessage: this.generateDisplayMessage(enhancedActivity)
    };

    return processed;
  }

  /**
   * Проверка валидности типа активности
   */
  private isValidActivityType(activityType: string): boolean {
    const validTypes: ActivityType[] = ['CHAPTER_COMPLETED', 'REVIEW_CREATED', 'COMMENT_CREATED'];
    return validTypes.includes(activityType as ActivityType);
  }

  /**
   * Форматирование времени активности для отображения
   */
  private formatActivityTime(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 7) {
        return date.toLocaleDateString('ru-RU');
      } else if (diffDays > 0) {
        return `${diffDays} дн. назад`;
      } else if (diffHours > 0) {
        return `${diffHours} ч. назад`;
      } else {
        return 'Только что';
      }
    } catch (error) {
      console.error('Ошибка форматирования времени:', error);
      return 'Недавно';
    }
  }

  /**
   * Генерация сообщения для отображения в зависимости от типа активности
   */
  private generateDisplayMessage(activity: BaseActivityDTO): string {
    switch (activity.activityType as ActivityType) {
      case 'CHAPTER_COMPLETED':
        return this.generateChapterCompletedMessage(activity);
      case 'REVIEW_CREATED':
        return this.generateReviewCreatedMessage(activity);
      case 'COMMENT_CREATED':
        return this.generateCommentCreatedMessage(activity);
      default:
        return activity.message || 'Неизвестная активность';
    }
  }

  /**
   * Генерация сообщения для завершенной главы
   */
  private generateChapterCompletedMessage(activity: BaseActivityDTO): string {
    
    if (activity.mangaTitle && activity.chapterNumber) {
      return `Прочитал главу ${activity.chapterNumber} - "${activity.mangaTitle}"`;
    } else if (activity.mangaTitle) {
      return `Прочитал главу в "${activity.mangaTitle}"`;
    }
    return activity.message || 'Прочитал главу';
  }

  /**
   * Генерация сообщения для созданного отзыва
   */
  private generateReviewCreatedMessage(activity: BaseActivityDTO): string {
    
    if (activity.mangaTitle) {
      return `Оставил отзыв на "${activity.mangaTitle}"`;
    }
    return activity.message || 'Оставил отзыв';
  }

  /**
   * Генерация сообщения для созданного комментария
   */
  private generateCommentCreatedMessage(activity: BaseActivityDTO): string {
    
    if (activity.mangaTitle) {
      return `Оставил комментарий к "${activity.mangaTitle}"`;
    }
    return activity.message || 'Оставил комментарий';
  }

  /**
   * Фильтрация активности по типу
   */
  async getActivityByType(userId: number, activityType: ActivityType, limit: number = 20): Promise<ProcessedActivityDTO[]> {
    try {
      const allActivity = await this.getUserActivity(userId, limit * 2); // Получаем больше для фильтрации
      return allActivity
        .filter(activity => activity.activityType === activityType)
        .slice(0, limit);
    } catch (error) {
      console.error(`Ошибка получения активности типа ${activityType}:`, error);
      throw error;
    }
  }

  /**
   * Проверка доступности API активности
   */
  async checkApiAvailability(): Promise<boolean> {
    try {
      await this.getReadingStatistics();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Получить комплексные данные профиля для блока "Активность"
   */
  async getProfileData(userId: number, activityLimit: number = 10) {
    try {
      const [activityResult, statisticsResult] = await Promise.allSettled([
        this.getUserActivity(userId, activityLimit),
        this.getReadingStatistics()
      ]);

      const activity = activityResult.status === 'fulfilled' ? activityResult.value : [];
      const statistics = statisticsResult.status === 'fulfilled' ? statisticsResult.value : null;

      // Добавляем информацию о последней активности в статистику
      if (statistics && activity.length > 0) {
        const lastActivity = activity[0];
        statistics.lastActivityDate = lastActivity.timestamp;
      }

      return {
        activity,
        statistics,
        hasErrors: activityResult.status === 'rejected' || statisticsResult.status === 'rejected',
        hasData: activity.length > 0 || (statistics?.hasActivity ?? false)
      };
    } catch (error) {
      console.error('Ошибка получения данных профиля:', error);
      return {
        activity: [],
        statistics: null,
        hasErrors: true,
        hasData: false
      };
    }
  }
}

export const activityStatsApi = new ActivityAndStatsApiWrapper();
