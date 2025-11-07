/**
 * Утилиты для тестирования и отладки новых API активности и статистики
 */

import { activityStatsApi } from './activityStatsApi';
import { authService } from './authServiceExtended';

export class ApiTester {
  /**
   * Тест всех endpoint'ов активности и статистики
   */
  static async testAllEndpoints(userId: number) {
    console.group('🔍 Тестирование API активности и статистики');
    
    const results = {
      userActivity: await this.testUserActivity(userId),
      readingActivity: await this.testReadingActivity(userId),
      reviewActivity: await this.testReviewActivity(userId),
      readingStats: await this.testReadingStats()
    };

    console.log('📊 Результаты тестирования:', results);
    console.groupEnd();
    
    return results;
  }

  /**
   * Тест общей активности пользователя
   */
  static async testUserActivity(userId: number) {
    try {
      console.log(`🔗 Тестируем /api/auth/activity/user/${userId}`);
      const activities = await authService.getUserActivity(userId, 5);
      console.log('✅ Активность пользователя:', activities);
      return { success: true, count: activities.length, data: activities };
    } catch (error) {
      console.error('❌ Ошибка активности пользователя:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Тест активности чтения
   */
  static async testReadingActivity(userId: number) {
    try {
      console.log(`🔗 Тестируем /api/auth/activity/user/${userId}/reading`);
      const activities = await authService.getUserReadingActivity(userId, 5);
      console.log('✅ Активность чтения:', activities);
      return { success: true, count: activities.length, data: activities };
    } catch (error) {
      console.error('❌ Ошибка активности чтения:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Тест активности отзывов
   */
  static async testReviewActivity(userId: number) {
    try {
      console.log(`🔗 Тестируем /api/auth/activity/user/${userId}/reviews`);
      const activities = await authService.getUserReviewActivity(userId, 5);
      console.log('✅ Активность отзывов:', activities);
      return { success: true, count: activities.length, data: activities };
    } catch (error) {
      console.error('❌ Ошибка активности отзывов:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Тест статистики чтения
   */
  static async testReadingStats() {
    try {
      console.log('🔗 Тестируем /api/auth/progress/stats');
      const stats = await authService.getReadingStatistics();
      console.log('✅ Статистика чтения:', stats);
      return { success: true, data: stats };
    } catch (error) {
      console.error('❌ Ошибка статистики чтения:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Тест проверки доступности API
   */
  static async testApiAvailability() {
    console.log('🔍 Проверяем доступность API...');
    const isAvailable = await activityStatsApi.checkApiAvailability();
    console.log(isAvailable ? '✅ API доступно' : '❌ API недоступно');
    return isAvailable;
  }

  /**
   * Получить комплексные данные для отладки
   */
  static async getDebugData(userId: number) {
    console.group('🐛 Сбор отладочных данных');
    
    const debugData = {
      timestamp: new Date().toISOString(),
      userId,
      apiAvailable: await this.testApiAvailability(),
      authToken: !!authService.getToken(),
      userRole: authService.getUserRole(),
      isAuthenticated: authService.isAuthenticated(),
      tests: await this.testAllEndpoints(userId)
    };

    console.log('📋 Отладочные данные:', debugData);
    console.groupEnd();
    
    return debugData;
  }

  /**
   * Проверка схем данных
   */
  static validateActivityData(activities: any[]) {
    const requiredFields = ['id', 'userId', 'activityType', 'message', 'timestamp'];
    const results = activities.map(activity => {
      const missing = requiredFields.filter(field => !(field in activity));
      return {
        id: activity.id,
        valid: missing.length === 0,
        missingFields: missing
      };
    });

    console.log('📝 Валидация данных активности:', results);
    return results;
  }

  static validateStatsData(stats: any) {
    const expectedFields = [
      'totalMangaRead', 
      'totalChaptersRead', 
      'totalReadingTimeMinutes',
      'favoriteGenres',
      'readingStreak',
      'averageRating'
    ];
    
    const present = expectedFields.filter(field => field in stats);
    const missing = expectedFields.filter(field => !(field in stats));
    
    const result = {
      valid: missing.length === 0,
      presentFields: present,
      missingFields: missing,
      data: stats
    };

    console.log('📊 Валидация статистики:', result);
    return result;
  }
}

// Глобальная функция для быстрого тестирования в консоли
if (import.meta.env.DEV) {
  ;(window as any).testProfileApi = ApiTester.getDebugData
  ;(window as any).testActivityApi = ApiTester.testAllEndpoints
}

export { activityStatsApi, authService as extendedAuthService };
