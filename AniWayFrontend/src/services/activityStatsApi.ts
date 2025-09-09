import { authService as extendedAuthService } from './authServiceExtended';

/**
 * Расширение для существующих API с новыми методами активности и статистики
 */
class ActivityAndStatsApiWrapper {
  /**
   * Получить активность пользователя
   */
  async getUserActivity(userId: number, limit: number = 20) {
    try {
      return await extendedAuthService.getUserActivity(userId, limit);
    } catch (error) {
      console.error('Ошибка получения активности пользователя:', error);
      throw error;
    }
  }

  /**
   * Получить активность чтения пользователя
   */
  async getUserReadingActivity(userId: number, limit: number = 20) {
    try {
      return await extendedAuthService.getUserReadingActivity(userId, limit);
    } catch (error) {
      console.error('Ошибка получения активности чтения:', error);
      throw error;
    }
  }

  /**
   * Получить активность отзывов пользователя
   */
  async getUserReviewActivity(userId: number, limit: number = 20) {
    try {
      return await extendedAuthService.getUserReviewActivity(userId, limit);
    } catch (error) {
      console.error('Ошибка получения активности отзывов:', error);
      throw error;
    }
  }

  /**
   * Получить статистику чтения
   */
  async getReadingStatistics() {
    try {
      return await extendedAuthService.getReadingStatistics();
    } catch (error) {
      console.error('Ошибка получения статистики чтения:', error);
      throw error;
    }
  }

  /**
   * Проверка доступности API
   */
  async checkApiAvailability(): Promise<boolean> {
    try {
      // Простая проверка - пытаемся получить статистику
      await this.getReadingStatistics();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Получить комплексные данные профиля (активность + статистика)
   */
  async getProfileData(userId: number, activityLimit: number = 10) {
    try {
      const [activity, statistics] = await Promise.allSettled([
        this.getUserActivity(userId, activityLimit),
        this.getReadingStatistics()
      ]);

      return {
        activity: activity.status === 'fulfilled' ? activity.value : [],
        statistics: statistics.status === 'fulfilled' ? statistics.value : null,
        hasErrors: activity.status === 'rejected' || statistics.status === 'rejected'
      };
    } catch (error) {
      console.error('Ошибка получения данных профиля:', error);
      return {
        activity: [],
        statistics: null,
        hasErrors: true
      };
    }
  }
}

export const activityStatsApi = new ActivityAndStatsApiWrapper();
