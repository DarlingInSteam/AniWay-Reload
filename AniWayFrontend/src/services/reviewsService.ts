import { apiClient } from '@/lib/api';
import { UserReview } from '@/types/profile';

export interface CreateReviewData {
  mangaId: number;
  rating: number;
  text: string;
  spoilerWarning?: boolean;
}

export interface UpdateReviewData {
  rating?: number;
  text?: string;
  spoilerWarning?: boolean;
}

class ReviewsService {
  /**
   * Создать новый отзыв
   */
  async createReview(data: CreateReviewData): Promise<UserReview> {
    try {
      if (!data.text.trim()) {
        throw new Error('Текст отзыва не может быть пустым');
      }

      if (data.rating < 1 || data.rating > 10) {
        throw new Error('Рейтинг должен быть от 1 до 10');
      }

      return await apiClient.createReview(data.mangaId, {
        rating: data.rating,
        comment: data.text
      });
    } catch (error) {
      console.error('Ошибка при создании отзыва:', error);
      throw error instanceof Error ? error : new Error('Не удалось создать отзыв');
    }
  }

  /**
   * Обновить существующий отзыв
   */
  async updateReview(reviewId: string, data: UpdateReviewData): Promise<UserReview> {
    try {
      if (data.text && !data.text.trim()) {
        throw new Error('Текст отзыва не может быть пустым');
      }

      if (data.rating && (data.rating < 1 || data.rating > 10)) {
        throw new Error('Рейтинг должен быть от 1 до 10');
      }

      return await apiClient.updateReview(reviewId, {
        rating: data.rating || 1,
        comment: data.text || ''
      });
    } catch (error) {
      console.error('Ошибка при обновлении отзыва:', error);
      throw error instanceof Error ? error : new Error('Не удалось обновить отзыв');
    }
  }

  /**
   * Удалить отзыв
   */
  async deleteReview(reviewId: string): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.deleteReview(reviewId);
    } catch (error) {
      console.error('Ошибка при удалении отзыва:', error);
      throw new Error('Не удалось удалить отзыв');
    }
  }

  /**
   * Получить отзывы пользователя
   */
  async getUserReviews(userId?: number): Promise<UserReview[]> {
    try {
      const reviews = await apiClient.getUserReviews(userId);
      
      // Получаем данные манги для каждого отзыва
      const reviewsWithMangaData = await Promise.all(
        reviews.map(async (review) => {
          let mangaTitle = `Манга ${review.mangaId}`;
          try {
            const manga = await apiClient.getMangaById(review.mangaId);
            mangaTitle = manga.title || mangaTitle;
          } catch (error) {
            console.warn(`Не удалось загрузить данные манги ${review.mangaId}:`, error);
          }

          return {
            id: review.id.toString(),
            mangaId: review.mangaId,
            mangaTitle,
            rating: review.rating,
            text: review.comment || '',
            createdAt: new Date(review.createdAt),
            likes: review.likesCount || 0
          };
        })
      );

      return reviewsWithMangaData;
    } catch (error) {
      console.error('Ошибка при получении отзывов пользователя:', error);
      throw new Error('Не удалось загрузить отзывы');
    }
  }

  /**
   * Получить отзывы для конкретной манги
   */
  async getMangaReviews(mangaId: number): Promise<UserReview[]> {
    try {
      const reviews = await apiClient.getMangaReviews(mangaId);
      
      // Получаем данные манги один раз для всех отзывов
      let mangaTitle = `Манга ${mangaId}`;
      try {
        const manga = await apiClient.getMangaById(mangaId);
        mangaTitle = manga.title || mangaTitle;
      } catch (error) {
        console.warn(`Не удалось загрузить данные манги ${mangaId}:`, error);
      }

      return reviews.map(review => ({
        id: review.id,
        mangaId: review.mangaId,
        mangaTitle,
        rating: review.rating,
        text: review.text,
        createdAt: new Date(review.createdAt),
        likes: review.likesCount || 0
      }));
    } catch (error) {
      console.error('Ошибка при получении отзывов для манги:', error);
      throw new Error('Не удалось загрузить отзывы');
    }
  }

  /**
   * Поставить лайк отзыву
   */
  async likeReview(reviewId: string): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.likeReview(reviewId);
    } catch (error) {
      console.error('Ошибка при лайке отзыва:', error);
      throw new Error('Не удалось поставить лайк');
    }
  }

  /**
   * Убрать лайк с отзыва
   */
  async unlikeReview(reviewId: string): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.unlikeReview(reviewId);
    } catch (error) {
      console.error('Ошибка при снятии лайка:', error);
      throw new Error('Не удалось убрать лайк');
    }
  }

  /**
   * Переключить лайк отзыва
   */
  async toggleReviewLike(reviewId: string, isLiked: boolean): Promise<{ success: boolean; message: string; isLiked: boolean }> {
    try {
      let result;
      if (isLiked) {
        result = await this.unlikeReview(reviewId);
        return { ...result, isLiked: false };
      } else {
        result = await this.likeReview(reviewId);
        return { ...result, isLiked: true };
      }
    } catch (error) {
      console.error('Ошибка при переключении лайка:', error);
      throw new Error('Не удалось изменить статус лайка');
    }
  }

  /**
   * Проверить, есть ли отзыв пользователя на мангу
   */
  async hasUserReviewForManga(mangaId: number): Promise<boolean> {
    try {
      const userReviews = await this.getUserReviews();
      return userReviews.some(review => review.mangaId === mangaId);
    } catch (error) {
      console.error('Ошибка при проверке отзыва:', error);
      return false;
    }
  }

  /**
   * Получить отзыв пользователя для конкретной манги
   */
  async getUserReviewForManga(mangaId: number): Promise<UserReview | null> {
    try {
      const userReviews = await this.getUserReviews();
      return userReviews.find(review => review.mangaId === mangaId) || null;
    } catch (error) {
      console.error('Ошибка при получении отзыва для манги:', error);
      return null;
    }
  }

  /**
   * Получить средний рейтинг манги на основе отзывов
   */
  async getMangaAverageRating(mangaId: number): Promise<number> {
    try {
      const reviews = await this.getMangaReviews(mangaId);
      if (reviews.length === 0) return 0;

      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      return Math.round((totalRating / reviews.length) * 10) / 10; // Округляем до 1 знака после запятой
    } catch (error) {
      console.error('Ошибка при расчете среднего рейтинга:', error);
      return 0;
    }
  }

  /**
   * Получить количество отзывов пользователя
   */
  async getUserReviewsCount(): Promise<number> {
    try {
      const reviews = await this.getUserReviews();
      return reviews.length;
    } catch (error) {
      console.error('Ошибка при получении количества отзывов:', error);
      return 0;
    }
  }

  /**
   * Получить последние отзывы пользователя
   */
  async getRecentUserReviews(limit: number = 5): Promise<UserReview[]> {
    try {
      const reviews = await this.getUserReviews();
      return reviews
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Ошибка при получении последних отзывов:', error);
      return [];
    }
  }

  /**
   * Валидировать данные отзыва
   */
  validateReviewData(data: CreateReviewData | UpdateReviewData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if ('text' in data && data.text !== undefined) {
      if (!data.text.trim()) {
        errors.push('Текст отзыва не может быть пустым');
      } else if (data.text.length < 10) {
        errors.push('Отзыв должен содержать минимум 10 символов');
      } else if (data.text.length > 5000) {
        errors.push('Отзыв не может содержать более 5000 символов');
      }
    }

    if ('rating' in data && data.rating !== undefined) {
      if (data.rating < 1 || data.rating > 10) {
        errors.push('Рейтинг должен быть от 1 до 10');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export const reviewsService = new ReviewsService();
