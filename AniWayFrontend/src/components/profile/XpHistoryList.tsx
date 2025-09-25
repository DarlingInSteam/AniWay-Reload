import React from 'react';
import { useUserXpHistory } from '@/hooks/useUserXpHistory';

interface Props {
  userId: number | undefined;
  compact?: boolean;
}

const typeLabels: Record<string,string> = {
  LIKE_RECEIVED: 'Лайк комментария',
  POST_UPVOTED: 'Голос за пост',
  CHAPTER_READ: 'Прочитан глава',
  CHAPTER_LIKE_RECEIVED: 'Лайк главы',
  COMMENT_CREATED: 'Комментарий',
  FORUM_THREAD_LIKE_RECEIVED: 'Лайк темы форума',
  FORUM_POST_LIKE_RECEIVED: 'Лайк поста форума',
  REVIEW_LIKE_RECEIVED: 'Лайк отзыва',
  BADGE_AWARDED: 'Бейдж'
};

export const XpHistoryList: React.FC<Props> = ({ userId, compact }) => {
  const { data, isLoading, isError } = useUserXpHistory(userId, { page: 0, size: compact ? 8 : 25 });

  if (!userId) return <div className="text-sm text-muted-foreground">Нет пользователя</div>;
  if (isLoading) return <div className="text-sm text-muted-foreground">Загрузка XP...</div>;
  if (isError) return <div className="text-sm text-red-500">Ошибка загрузки XP</div>;

  const rows = (data?.content || []) as any[];
  if (!rows.length) return <div className="text-sm text-muted-foreground">Нет XP транзакций</div>;

  return (
    <div className="space-y-2">
      {!compact && (
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-2 text-[11px] uppercase tracking-wide text-slate-500">
          <div>Действие</div>
          <div className="text-right">XP</div>
          <div className="text-right">Когда</div>
        </div>
      )}
      {rows.map(tx => {
        const label = typeLabels[tx.sourceType] || tx.sourceType;
        const created = tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '';
        const xp = typeof tx.xpAmount === 'number' ? tx.xpAmount : (typeof tx.delta === 'number' ? tx.delta : 0);
        return (
          <div key={tx.id} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center rounded border border-border/60 bg-white/5 hover:bg-white/10 transition px-3 py-1.5 text-sm">
            <div className="flex flex-col min-w-0">
              <span className="font-medium truncate" title={label}>{label}</span>
              <span className="text-[11px] text-muted-foreground truncate" title={created}>{created}</span>
            </div>
            <div className={"text-right font-semibold " + (xp > 0 ? 'text-emerald-500' : xp < 0 ? 'text-red-500' : 'text-slate-400')}>
              {xp > 0 ? '+' + xp : xp}
            </div>
            <div className="text-right text-[11px] text-slate-400 hidden sm:block">{created}</div>
          </div>
        );
      })}
    </div>
  );
};

export default XpHistoryList;