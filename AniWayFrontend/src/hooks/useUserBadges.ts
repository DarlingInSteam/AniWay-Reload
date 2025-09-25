import { useQuery } from '@tanstack/react-query';

export interface UserBadgeResponse {
  badgeCode: string;
  awardedAt: string;
}

async function fetchUserBadges(userId: number): Promise<UserBadgeResponse[]> {
  const res = await fetch(`/levels/${userId}/badges`);
  if (!res.ok) throw new Error('Failed to fetch user badges');
  return res.json();
}

export function useUserBadges(userId?: number) {
  return useQuery({
    queryKey: ['user-badges', userId],
    queryFn: () => fetchUserBadges(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
}
