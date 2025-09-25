import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface UserBadgeResponse {
  badgeCode: string;
  awardedAt: string;
}

async function fetchUserBadges(userId: number, signal?: AbortSignal): Promise<UserBadgeResponse[]> {
  try {
    return await (apiClient as any).request(`/levels/${userId}/badges`, { signal });
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (/401|403|404/.test(msg)) {
      console.info(`[useUserBadges] Non-fatal ${msg}; returning [] for user ${userId}`);
      return [];
    }
    throw e;
  }
}

export function useUserBadges(userId?: number) {
  return useQuery<UserBadgeResponse[]>({
    queryKey: ['user-badges', userId],
    queryFn: ({ signal }) => fetchUserBadges(userId!, signal),
    enabled: !!userId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
