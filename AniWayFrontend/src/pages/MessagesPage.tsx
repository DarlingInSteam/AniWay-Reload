import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import MessagesWorkspace from '@/components/messages/MessagesWorkspace';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  const composeTarget = useMemo(() => {
    const state = location.state as { composeUser?: { id: number; displayName?: string; username?: string; avatar?: string }; composeSession?: number } | null;
    if (!state?.composeUser) return null;
    return {
      ...state.composeUser,
      session: state.composeSession,
    };
  }, [location.state]);

  return (
    <div className="h-[calc(100vh-88px)] flex flex-col overflow-hidden text-white">
      <div className="mx-auto flex w-full max-w-[1500px] flex-1 min-h-0 flex-col overflow-hidden px-4 pt-1 pb-[2px] sm:px-6 sm:pt-1.5 sm:pb-[2px] lg:px-10 lg:pt-2 lg:pb-[2px]">
        <MessagesWorkspace
          currentUserId={user?.id}
          initialComposeUser={composeTarget ?? undefined}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default MessagesPage;
