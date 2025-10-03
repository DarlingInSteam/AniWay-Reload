import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import GlassPanel from '@/components/ui/GlassPanel';
import MessagesWorkspace from '@/components/messages/MessagesWorkspace';

export const MessagesPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 text-white">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Личные сообщения</h1>
        <p className="text-sm text-slate-300">
          Общайтесь с друзьями и следите за личными диалогами. Выберите беседу, чтобы просмотреть историю и отправить новые сообщения.
        </p>
      </header>

      <GlassPanel className="rounded-2xl border border-white/10 bg-white/5" padding="lg">
        <MessagesWorkspace currentUserId={user?.id} />
      </GlassPanel>
    </div>
  );
};

export default MessagesPage;
