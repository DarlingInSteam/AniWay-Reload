import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface UserLevelResponse {
  userId: number;
  level: number;
  totalXp: number;
  xpForNextLevel: number;
  xpIntoCurrentLevel: number;
  progress: number; // 0..1
}

/**
 * Fetch user level via centralized ApiClient so Authorization headers & logging are consistent.
 * Gracefully handles 401/404 by returning undefined (allows UI fallback without triggering login modal).
 */
async function fetchUserLevel(userId: number, signal?: AbortSignal): Promise<UserLevelResponse | undefined> {
  try {
    // Direct request using low-level apiClient.request to reuse headers / logging. Endpoint already public.
    return await (apiClient as any).request(`/levels/${userId}`, { signal });
  } catch (e: any) {
    const msg = String(e?.message || '');
    if (/401|403|404/.test(msg)) {
      // Silent fallback -> undefined so component can derive a placeholder level.
      console.info(`[useUserLevel] Non-fatal ${msg}; returning fallback for user ${userId}`);
      return undefined;
    }
    // Re-throw unexpected errors so React Query can surface (network, 5xx etc.)
    throw e;
  }
}

export function useUserLevel(userId?: number) {
  return useQuery<UserLevelResponse | undefined>({
    queryKey: ['user-level', userId],
    queryFn: ({ signal }) => fetchUserLevel(userId!, signal),
    enabled: !!userId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
