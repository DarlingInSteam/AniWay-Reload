// services/reviewService.ts
export interface MangaRating {
  mangaId: number;
  averageRating: number;
  totalReviews: number;
}

class ReviewService {
  private cache = new Map<number, MangaRating>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps = new Map<number, number>();

  async getMangaRating(mangaId: number): Promise<MangaRating | null> {
    // Check cache first
    const cacheKey = mangaId;
    const cachedRating = this.cache.get(cacheKey);
    const cacheTime = this.cacheTimestamps.get(cacheKey);
    
    if (cachedRating && cacheTime && Date.now() - cacheTime < this.cacheTimeout) {
      return cachedRating;
    }

    try {
      const response = await fetch(`/api/auth/reviews/manga/${mangaId}/rating`);
      if (response.ok) {
        const data = await response.json();
        const rating: MangaRating = {
          mangaId: data.mangaId,
          averageRating: data.averageRating || 0,
          totalReviews: data.totalReviews || 0
        };
        
        // Cache the result
        this.cache.set(cacheKey, rating);
        this.cacheTimestamps.set(cacheKey, Date.now());
        
        return rating;
      }
    } catch (error) {
      console.error('Failed to fetch manga rating:', error);
    }
    
    return null;
  }

  async getMangaRatings(mangaIds: number[]): Promise<Map<number, MangaRating>> {
    const results = new Map<number, MangaRating>();
    
    // Split into batches to avoid overwhelming the server
    const batchSize = 10;
    for (let i = 0; i < mangaIds.length; i += batchSize) {
      const batch = mangaIds.slice(i, i + batchSize);
      const promises = batch.map(id => this.getMangaRating(id));
      const ratings = await Promise.all(promises);
      
      ratings.forEach((rating, index) => {
        if (rating) {
          results.set(batch[index], rating);
        }
      });
    }
    
    return results;
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }
}

export const reviewService = new ReviewService();
