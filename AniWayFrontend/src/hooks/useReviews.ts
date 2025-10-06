import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api';

export interface ReviewData {
  id: number;
  userId: number;
  username: string;
  userDisplayName: string;
  userAvatar?: string;
  mangaId: number;
  rating: number;
  comment: string;
  likesCount: number;
  dislikesCount: number;
  commentsCount: number;
  trustFactor: number;
  trustFactorColor: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  canEdit: boolean;
  canDelete: boolean;
  userLiked?: boolean;
  userDisliked?: boolean;
}

interface UseReviewsReturn {
  reviews: ReviewData[];
  userReview: ReviewData | null;
  error: string | null;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  createReview: (rating: number, comment: string) => Promise<void>;
  updateReview: (reviewId: number, rating: number, comment: string) => Promise<void>;
  deleteReview: (reviewId: number) => Promise<void>;
  likeReview: (reviewId: number) => Promise<void>;
  dislikeReview: (reviewId: number) => Promise<void>;
  updateCommentsCount: (reviewId: number, count: number) => void;
  clearError: () => void;
}

export function useReviews(mangaId: number): UseReviewsReturn {
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [userReview, setUserReview] = useState<ReviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Загрузка отзывов
  const fetchReviews = useCallback(async () => {
    if (!mangaId) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.getMangaReviews(mangaId);
      setReviews(data || []);

      // Получаем отзыв текущего пользователя
      const currentUserId = parseInt(localStorage.getItem('userId') || '0');
      if (currentUserId) {
        const userReviewData = data?.find((r: ReviewData) => r.userId === currentUserId);
        setUserReview(userReviewData || null);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Не удалось загрузить отзывы');
    } finally {
      setIsLoading(false);
    }
  }, [mangaId]);

  // Создание отзыва
  const createReview = useCallback(async (rating: number, comment: string) => {
    setIsCreating(true);
    setError(null);

    try {
      const newReview = await apiClient.createReview(mangaId, { rating, comment });
      setUserReview(newReview);
      await fetchReviews(); // Обновляем список
    } catch (err) {
      console.error('Error creating review:', err);
      setError('Не удалось создать отзыв');
    } finally {
      setIsCreating(false);
    }
  }, [mangaId, fetchReviews]);

  // Обновление отзыва
  const updateReview = useCallback(async (reviewId: number, rating: number, comment: string) => {
    setIsUpdating(true);
    setError(null);

    try {
      const updatedReview = await apiClient.updateReview(reviewId.toString(), { rating, comment });
      setUserReview(updatedReview);
      await fetchReviews(); // Обновляем список
    } catch (err) {
      console.error('Error updating review:', err);
      setError('Не удалось обновить отзыв');
    } finally {
      setIsUpdating(false);
    }
  }, [fetchReviews]);

  // Удаление отзыва
  const deleteReview = useCallback(async (reviewId: number) => {
    setError(null);

    try {
      await apiClient.deleteReview(reviewId.toString());
      setUserReview(null);
      await fetchReviews(); // Обновляем список
    } catch (err) {
      console.error('Error deleting review:', err);
      setError('Не удалось удалить отзыв');
    }
  }, [fetchReviews]);

  // Лайк отзыва
  const likeReview = useCallback(async (reviewId: number) => {
    try {
      await apiClient.likeReview(reviewId.toString());
      
      // Оптимистичное обновление UI
      setReviews(prev => prev.map(review => {
        if (review.id === reviewId) {
          const wasLiked = review.userLiked;
          return {
            ...review,
            likesCount: wasLiked ? review.likesCount - 1 : review.likesCount + 1,
            userLiked: !wasLiked,
            userDisliked: false,
            dislikesCount: review.userDisliked ? review.dislikesCount - 1 : review.dislikesCount
          };
        }
        return review;
      }));

      // Обновляем userReview если это отзыв пользователя
      if (userReview && userReview.id === reviewId) {
        const wasLiked = userReview.userLiked;
        setUserReview({
          ...userReview,
          likesCount: wasLiked ? userReview.likesCount - 1 : userReview.likesCount + 1,
          userLiked: !wasLiked,
          userDisliked: false,
          dislikesCount: userReview.userDisliked ? userReview.dislikesCount - 1 : userReview.dislikesCount
        });
      }
    } catch (err) {
      console.error('Error liking review:', err);
      await fetchReviews(); // Откат при ошибке
    }
  }, [userReview, fetchReviews]);

  // Дизлайк отзыва
  const dislikeReview = useCallback(async (reviewId: number) => {
    try {
      await apiClient.dislikeReview(reviewId.toString());
      
      // Оптимистичное обновление UI
      setReviews(prev => prev.map(review => {
        if (review.id === reviewId) {
          const wasDisliked = review.userDisliked;
          return {
            ...review,
            dislikesCount: wasDisliked ? review.dislikesCount - 1 : review.dislikesCount + 1,
            userDisliked: !wasDisliked,
            userLiked: false,
            likesCount: review.userLiked ? review.likesCount - 1 : review.likesCount
          };
        }
        return review;
      }));

      // Обновляем userReview если это отзыв пользователя
      if (userReview && userReview.id === reviewId) {
        const wasDisliked = userReview.userDisliked;
        setUserReview({
          ...userReview,
          dislikesCount: wasDisliked ? userReview.dislikesCount - 1 : userReview.dislikesCount + 1,
          userDisliked: !wasDisliked,
          userLiked: false,
          likesCount: userReview.userLiked ? userReview.likesCount - 1 : userReview.likesCount
        });
      }
    } catch (err) {
      console.error('Error disliking review:', err);
      await fetchReviews(); // Откат при ошибке
    }
  }, [userReview, fetchReviews]);

  // Обновление счетчика комментариев
  const updateCommentsCount = useCallback((reviewId: number, count: number) => {
    setReviews(prev => prev.map(review => 
      review.id === reviewId ? { ...review, commentsCount: count } : review
    ));

    if (userReview && userReview.id === reviewId) {
      setUserReview({ ...userReview, commentsCount: count });
    }
  }, [userReview]);

  // Очистка ошибки
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Загрузка при монтировании
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return {
    reviews,
    userReview,
    error,
    isLoading,
    isCreating,
    isUpdating,
    createReview,
    updateReview,
    deleteReview,
    likeReview,
    dislikeReview,
    updateCommentsCount,
    clearError
  };
}
