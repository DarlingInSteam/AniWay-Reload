import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiClient } from '@/lib/api';
import type { FriendSummary, FriendView as FriendDto, FriendRequestView } from '@/types/social';

export type FriendshipStatus = 'self' | 'none' | 'friends' | 'incoming' | 'outgoing';

interface FriendDataState {
  friends: FriendDto[];
  myFriends: FriendDto[];
  summary: FriendSummary | null;
  incomingRequests: FriendRequestView[];
  outgoingRequests: FriendRequestView[];
}

const initialState: FriendDataState = {
  friends: [],
  myFriends: [],
  summary: null,
  incomingRequests: [],
  outgoingRequests: [],
};

function isAuthError(err: unknown): boolean {
  if (!err) return false;
  const message = typeof err === 'string' ? err : (err as Error)?.message;
  return typeof message === 'string' && /401|unauthorized/i.test(message);
}

export interface UseFriendDataResult {
  friends: FriendDto[];
  summary: FriendSummary | null;
  incomingRequests: FriendRequestView[];
  outgoingRequests: FriendRequestView[];
  myFriends: FriendDto[];
  status: FriendshipStatus;
  incomingRequestForTarget: FriendRequestView | null;
  outgoingRequestForTarget: FriendRequestView | null;
  refresh: () => Promise<void>;
  loading: boolean;
  error: unknown;
}

export function useFriendData(targetUserId: number, currentUserId?: number | null): UseFriendDataResult {
  const [state, setState] = useState<FriendDataState>(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const targetPromise = apiClient.getFriendsOfUser(targetUserId);
      const isAuthenticated = typeof currentUserId === 'number' && currentUserId > 0;

      const myFriendsPromise = isAuthenticated ? apiClient.getMyFriends().catch(err => {
        if (isAuthError(err)) return [] as FriendDto[];
        throw err;
      }) : Promise.resolve([] as FriendDto[]);

      const summaryPromise = isAuthenticated ? apiClient.getFriendSummary().catch(err => {
        if (isAuthError(err)) return null;
        throw err;
      }) : Promise.resolve(null);

      const incomingPromise = isAuthenticated ? apiClient.getIncomingFriendRequests().catch(err => {
        if (isAuthError(err)) return [] as FriendRequestView[];
        throw err;
      }) : Promise.resolve([] as FriendRequestView[]);

      const outgoingPromise = isAuthenticated ? apiClient.getOutgoingFriendRequests().catch(err => {
        if (isAuthError(err)) return [] as FriendRequestView[];
        throw err;
      }) : Promise.resolve([] as FriendRequestView[]);

      const [friendsOfTarget, myFriends, summary, incoming, outgoing] = await Promise.all([
        targetPromise,
        myFriendsPromise,
        summaryPromise,
        incomingPromise,
        outgoingPromise,
      ]);

      setState({
        friends: friendsOfTarget,
        myFriends: myFriends,
        summary: summary,
        incomingRequests: incoming,
        outgoingRequests: outgoing,
      });
    } catch (err) {
      if (isAuthError(err)) {
        setError(null);
        setState(initialState);
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, [targetUserId, currentUserId]);

  useEffect(() => {
    if (!targetUserId) return;
    fetchAll();
  }, [fetchAll, targetUserId]);

  const { friends, myFriends, summary, incomingRequests, outgoingRequests } = state;

  const statusData = useMemo(() => {
    if (!currentUserId || currentUserId === targetUserId) {
      return {
        status: currentUserId === targetUserId ? 'self' as FriendshipStatus : 'none' as FriendshipStatus,
        incoming: null as FriendRequestView | null,
        outgoing: null as FriendRequestView | null,
      };
    }

    const myFriendIds = new Set(myFriends.map(f => f.friendUserId));
    if (myFriendIds.has(targetUserId)) {
      return { status: 'friends' as FriendshipStatus, incoming: null, outgoing: null };
    }

    const incoming = incomingRequests.find(req => req.requesterId === targetUserId && req.status === 'PENDING') || null;
    if (incoming) {
      return { status: 'incoming' as FriendshipStatus, incoming, outgoing: null };
    }

    const outgoing = outgoingRequests.find(req => req.receiverId === targetUserId && req.status === 'PENDING') || null;
    if (outgoing) {
      return { status: 'outgoing' as FriendshipStatus, incoming: null, outgoing };
    }

    return { status: 'none' as FriendshipStatus, incoming: null, outgoing: null };
  }, [currentUserId, targetUserId, myFriends, incomingRequests, outgoingRequests]);

  const friendsToShow = useMemo(() => {
    if (currentUserId && currentUserId === targetUserId) {
      return myFriends;
    }
    return friends;
  }, [friends, myFriends, currentUserId, targetUserId]);

  return {
    friends: friendsToShow,
    myFriends,
    summary,
    incomingRequests,
    outgoingRequests,
    status: statusData.status,
    incomingRequestForTarget: statusData.incoming,
    outgoingRequestForTarget: statusData.outgoing,
    refresh: fetchAll,
    loading,
    error,
  };
}

export default useFriendData;
