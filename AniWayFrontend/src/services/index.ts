// Централизованный экспорт всех API-сервисов для профиля
export { profileService } from './profileService';
export { favoritesService } from './favoritesService';
export { collectionService } from './collectionService';
export { readingProgressService } from './readingProgressService';
export { reviewsService } from './reviewsService';
export { extendedProfileService } from './extendedProfileService';

// НОВЫЕ API для активности и статистики
export { authService } from './authServiceExtended';
export { activityStatsApi } from './activityStatsApi';
export { ApiTester } from './apiTester';

// Экспорт новых типов
export type {
  ActivityDTO,
  ReadingStatistics
} from './authServiceExtended';

// Экспорт типов для удобства
export type {
  CreateCollectionData,
  UpdateCollectionData
} from './collectionService';

export type {
  UpdateReadingProgressData
} from './readingProgressService';

export type {
  CreateReviewData,
  UpdateReviewData
} from './reviewsService';

export type {
  ProfileSettingsData,
  ProfileStatistics
} from './extendedProfileService';

// Вспомогательные функции для быстрого доступа к основным операциям
export const quickProfileActions = {
  // Избранное
  async toggleFavorite(mangaId: number) {
    const { favoritesService } = await import('./favoritesService');
    return favoritesService.toggleFavorite(mangaId);
  },

  // Коллекции
  async createQuickCollection(name: string, mangaIds: number[] = []) {
    const { collectionService } = await import('./collectionService');
    return collectionService.createQuickCollection(name, mangaIds);
  },

  // Прогресс чтения
  async markChapterRead(mangaId: number, chapterNumber: number) {
    const { readingProgressService } = await import('./readingProgressService');
    return readingProgressService.markChapterAsRead(mangaId, chapterNumber);
  },

  async startReading(mangaId: number) {
    const { readingProgressService } = await import('./readingProgressService');
    return readingProgressService.startReading(mangaId);
  },

  // Отзывы
  async quickReview(mangaId: number, rating: number, text: string) {
    const { reviewsService } = await import('./reviewsService');
    return reviewsService.createReview({ mangaId, rating, text });
  }
};
