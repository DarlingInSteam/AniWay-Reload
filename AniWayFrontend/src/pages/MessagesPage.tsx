import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import GlassPanel from '@/components/ui/GlassPanel';
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 text-white">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Личные сообщения</h1>
      </header>

  <GlassPanel className="rounded-2xl border border-white/10 bg-white/5 h-[calc(100vh-220px)] min-h-[520px] overflow-visible" padding="none">
        <MessagesWorkspace currentUserId={user?.id} initialComposeUser={composeTarget ?? undefined} className="h-full px-4 py-5 sm:px-6 sm:py-6" />
      </GlassPanel>
    </div>
  );
};

export default MessagesPage;
