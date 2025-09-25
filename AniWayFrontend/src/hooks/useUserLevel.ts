import { useQuery } from '@tanstack/react-query';

export interface UserLevelResponse {
  userId: number;
  level: number;
  totalXp: number;
  xpForNextLevel: number;
  xpIntoCurrentLevel: number;
  progress: number; // 0..1
}

async function fetchUserLevel(userId: number): Promise<UserLevelResponse> {
  const res = await fetch(`/levels/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch user level');
  return res.json();
}

export function useUserLevel(userId?: number) {
  return useQuery({
    queryKey: ['user-level', userId],
    queryFn: () => fetchUserLevel(userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
}
