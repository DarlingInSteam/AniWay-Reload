import { Badge } from '@/components/ui/badge';
import type { CategoryView } from '@/types/social';

interface CategoryHeaderProps {
  category: CategoryView;
}

export function CategoryHeader({
  category,
}: CategoryHeaderProps) {
  const isUnread = category.unreadCount > 0;

  return (
    <div className="px-2 pb-3 pt-2 sm:px-4 lg:px-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-xl font-semibold text-white lg:text-2xl">{category.title}</h2>
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/35">
            <span>#{category.slug || 'канал'}</span>
            {category.isDefault && (
              <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-white/70">
                По умолчанию
              </span>
            )}
            {category.isArchived && (
              <Badge variant="outline" className="border-orange-300/50 bg-orange-500/10 text-[10px] uppercase text-orange-100">
                Архив
              </Badge>
            )}
            {isUnread && (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] uppercase text-primary">
                +{category.unreadCount} новых
              </span>
            )}
          </div>
        </div>
        {category.description && (
          <p className="max-w-3xl text-sm leading-relaxed text-white/55 lg:text-[15px]">
            {category.description}
          </p>
        )}
      </div>
    </div>
  );
}
