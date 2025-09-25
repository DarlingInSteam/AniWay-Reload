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
      {rows.map(tx => {
        const label = typeLabels[tx.sourceType] || tx.sourceType;
        const created = tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '';
        return (
          <div key={tx.id} className="flex items-center justify-between rounded border border-border px-3 py-1.5 text-sm">
            <div className="flex flex-col">
              <span className="font-medium">{label}</span>
              <span className="text-xs text-muted-foreground">{created}</span>
            </div>
            <div className={"font-semibold " + (tx.delta > 0 ? 'text-emerald-500' : tx.delta < 0 ? 'text-red-500' : 'text-muted-foreground')}>
              {tx.delta > 0 ? '+' + tx.delta : tx.delta}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default XpHistoryList;