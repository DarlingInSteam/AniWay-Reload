import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

interface UserReview {
  id: number;
  mangaId: number;
  mangaTitle?: string;
  rating: number;
  comment: string;
  likesCount: number;
  dislikesCount: number;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
}

export function useUserReviews(userId: number, limit = 3) {
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    const fetchReviews = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Используем готовый метод из apiClient
        const data = await apiClient.getUserReviews(userId);
        
        if (!cancelled) {
          // Ограничиваем количество отзывов и обогащаем данными о манге
          const limitedReviews = data.slice(0, limit);
          
          // Получаем названия манги для каждого отзыва
          const enrichedReviews = await Promise.all(
            limitedReviews.map(async (review) => {
              try {
                const mangaTitle = await apiClient.getMangaTitle(review.mangaId);
                return {
                  ...review,
                  mangaTitle: mangaTitle || `Манга #${review.mangaId}`
                };
              } catch {
                return {
                  ...review,
                  mangaTitle: `Манга #${review.mangaId}`
                };
              }
            })
          );
          
          setReviews(enrichedReviews);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Ошибка загрузки отзывов пользователя:', e);
          setError('Ошибка загрузки отзывов');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchReviews();

    return () => { 
      cancelled = true; 
    };
  }, [userId, limit]);

  return { reviews, loading, error, refetch: () => setReviews([]) };
}
