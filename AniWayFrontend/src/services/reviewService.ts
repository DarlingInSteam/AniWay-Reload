// services/reviewService.ts
export interface MangaRating {
  mangaId: number;
  averageRating: number;
  totalReviews: number;
}

type PendingResolver = {
  resolve: (value: MangaRating | null) => void;
  reject: (reason?: unknown) => void;
};

class ReviewService {
  private cache = new Map<number, MangaRating>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private cacheTimestamps = new Map<number, number>();
  private pendingRequests = new Map<number, PendingResolver[]>();
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_DELAY_MS = 20;
  private readonly BATCH_ENDPOINT = '/api/auth/reviews/manga/ratings/batch';
  private readonly MAX_BATCH_SIZE = 200;

  async getMangaRating(mangaId: number): Promise<MangaRating | null> {
    if (!Number.isFinite(mangaId)) {
      return null;
    }

    const cacheKey = mangaId;
    const cachedRating = this.cache.get(cacheKey);
    const cacheTime = this.cacheTimestamps.get(cacheKey);

    if (cachedRating && cacheTime && Date.now() - cacheTime < this.cacheTimeout) {
      return cachedRating;
    }

    return new Promise<MangaRating | null>((resolve, reject) => {
      const queue = this.pendingRequests.get(mangaId) ?? [];
      queue.push({ resolve, reject });
      this.pendingRequests.set(mangaId, queue);
      this.scheduleBatch();
    });
  }

  async getMangaRatings(mangaIds: number[]): Promise<Map<number, MangaRating>> {
    const results = new Map<number, MangaRating>();
    const missing: number[] = [];

    mangaIds.forEach((id) => {
      const cacheKey = id;
      const cachedRating = this.cache.get(cacheKey);
      const cacheTime = this.cacheTimestamps.get(cacheKey);
      if (cachedRating && cacheTime && Date.now() - cacheTime < this.cacheTimeout) {
        results.set(id, cachedRating);
      } else {
        missing.push(id);
      }
    });

    if (missing.length > 0) {
      const fetched = await this.fetchRatingsInChunks(missing);
      fetched.forEach((rating, id) => {
        results.set(id, rating);
      });
    }

    return results;
  }

  clearCache(): void {
    this.cache.clear();
    this.cacheTimestamps.clear();
    this.pendingRequests.clear();
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  private scheduleBatch() {
    if (this.batchTimer != null) {
      return;
    }
    this.batchTimer = setTimeout(() => this.flushBatch(), this.BATCH_DELAY_MS);
  }

  private async flushBatch() {
    const entries = Array.from(this.pendingRequests.entries());
    this.pendingRequests.clear();

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (!entries.length) {
      return;
    }

    const ids = entries.map(([id]) => id).filter((id) => Number.isFinite(id));
    if (!ids.length) {
      entries.forEach(([, resolvers]) => {
        resolvers.forEach(({ resolve }) => resolve(null));
      });
      return;
    }

    try {
      const fetched = await this.fetchRatingsInChunks(ids);

      entries.forEach(([id, resolvers]) => {
        const rating = fetched.get(id) ?? this.cache.get(id) ?? null;
        resolvers.forEach(({ resolve }) => resolve(rating));
      });
    } catch (error) {
      entries.forEach(([, resolvers]) => {
        resolvers.forEach(({ reject }) => reject(error));
      });
    }
  }

  private async fetchRatingsInChunks(ids: number[]): Promise<Map<number, MangaRating>> {
    const uniqueIds = Array.from(new Set(ids.filter((id) => Number.isFinite(id))));
    const aggregated = new Map<number, MangaRating>();

    if (uniqueIds.length === 0) {
      return aggregated;
    }

    for (let i = 0; i < uniqueIds.length; i += this.MAX_BATCH_SIZE) {
      const chunk = uniqueIds.slice(i, i + this.MAX_BATCH_SIZE);
      const chunkResult = await this.fetchRatingsBatch(chunk);
      chunkResult.forEach((value, key) => aggregated.set(key, value));
    }

    return aggregated;
  }

  private async fetchRatingsBatch(ids: number[]): Promise<Map<number, MangaRating>> {
    const result = new Map<number, MangaRating>();

    if (ids.length === 0) {
      return result;
    }

    const response = await fetch(this.BATCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mangaIds: ids })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch manga ratings batch: ${response.status} ${response.statusText}`);
    }

    const data: Array<{ mangaId: number; averageRating: number | null; totalReviews: number | null }> = await response.json();
    const now = Date.now();

    data.forEach((item) => {
      if (typeof item?.mangaId !== 'number') {
        return;
      }
      const rating: MangaRating = {
        mangaId: item.mangaId,
        averageRating: item.averageRating ?? 0,
        totalReviews: item.totalReviews ?? 0
      };
      result.set(item.mangaId, rating);
      this.cache.set(item.mangaId, rating);
      this.cacheTimestamps.set(item.mangaId, now);
    });

    ids.forEach((id) => {
      if (!result.has(id)) {
        const rating: MangaRating = { mangaId: id, averageRating: 0, totalReviews: 0 };
        result.set(id, rating);
        this.cache.set(id, rating);
        this.cacheTimestamps.set(id, now);
      }
    });

    return result;
  }
}

export const reviewService = new ReviewService();
