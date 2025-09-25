import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface XpTransaction {
  id: number;
  sourceType: string;
  sourceRef: string;
  delta: number;
  createdAt: string;
}

interface HistoryOptions {
  page?: number;
  size?: number;
  sourceType?: string;
  sinceDays?: number;
}

export function useUserXpHistory(userId: number | undefined, opts: HistoryOptions = {}) {
  const { page = 0, size = 20, sourceType, sinceDays } = opts;
  return useQuery({
    queryKey: ['xpHistory', userId, page, size, sourceType, sinceDays],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return { content: [], totalReturned: 0 };
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('size', String(size));
      if (sourceType) params.set('sourceType', sourceType);
      if (sinceDays) params.set('sinceDays', String(sinceDays));
      try {
  const res = await (apiClient as any).request(`/levels/${userId}/transactions?` + params.toString());
        return res;
      } catch (e: any) {
        // graceful fallback
        if (e?.status === 404 || e?.status === 401) return { content: [], totalReturned: 0 };
        throw e;
      }
    }
  });
}