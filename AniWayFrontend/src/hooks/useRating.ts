import { useState, useEffect } from 'react';
import { reviewService, type MangaRating } from '@/services/reviewService';

export function useRating(mangaId: number) {
  const [rating, setRating] = useState<MangaRating | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRating = async () => {
      try {
        setLoading(true);
        const mangaRating = await reviewService.getMangaRating(mangaId);
        setRating(mangaRating);
      } catch (error) {
        console.error('Failed to load rating:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRating();
  }, [mangaId]);

  return { rating, loading };
}

export function useRatings(mangaIds: number[]) {
  const [ratings, setRatings] = useState<Map<number, MangaRating>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRatings = async () => {
      try {
        setLoading(true);
        const mangaRatings = await reviewService.getMangaRatings(mangaIds);
        setRatings(mangaRatings);
      } catch (error) {
        console.error('Failed to load ratings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (mangaIds.length > 0) {
      loadRatings();
    }
  }, [mangaIds]);

  return { ratings, loading };
}
