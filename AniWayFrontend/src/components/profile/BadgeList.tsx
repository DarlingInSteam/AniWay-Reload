import React from 'react';
import { ProfilePanel } from './ProfilePanel';
import { useUserBadges } from '@/hooks/useUserBadges';

interface BadgeListProps {
  userId: number;
}

// Simple mapping for now; can be externalized.
const BADGE_META: Record<string, { label: string; description: string; icon: string; color: string }> = {
  FIRST_LIKE_RECEIVED: { label: 'Первый лайк', description: 'Получен первый лайк', icon: '👍', color: 'from-emerald-400 to-emerald-600' },
  TEN_COMMENTS: { label: '10 комментариев', description: 'Оставлено 10 комментариев', icon: '💬', color: 'from-sky-400 to-sky-600' },
  HUNDRED_CHAPTERS: { label: '100 глав', description: 'Прочитано 100 глав', icon: '📚', color: 'from-violet-400 to-violet-600' },
};

export const BadgeList: React.FC<BadgeListProps> = ({ userId }) => {
  const { data, isLoading, error } = useUserBadges(userId);

  return (
    <ProfilePanel title="Бейджи" actions={<span className="text-xs text-slate-400">{data?.length || 0}</span>}>
      {isLoading && <div className="text-sm text-slate-400">Загрузка...</div>}
      {error && <div className="text-sm text-red-400">Ошибка загрузки бейджей</div>}
      {!isLoading && !error && (!data || data.length === 0) && (
        <div className="text-sm text-slate-400">Пока нет бейджей</div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data?.map(b => {
          const meta = BADGE_META[b.badgeCode] || { label: b.badgeCode, description: b.badgeCode, icon: '✨', color: 'from-gray-500 to-gray-700' };
          return (
            <div key={b.badgeCode} className="relative group">
              <div className={`rounded-xl p-3 flex flex-col items-center justify-center text-center bg-gradient-to-br ${meta.color} text-white shadow-md min-h-[90px]`}>
                <div className="text-2xl mb-1 drop-shadow-sm">{meta.icon}</div>
                <div className="text-xs font-semibold leading-tight">{meta.label}</div>
                <div className="text-[10px] opacity-70 mt-1 line-clamp-2">{meta.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </ProfilePanel>
  );
};
