import { cn } from '@/lib/utils';
import type { CategoryView } from '@/types/social';

interface CategoryQuickBarProps {
  categories: CategoryView[];
  selectedCategoryId: number | null;
  onSelectCategory: (categoryId: number) => void;
}

export function CategoryQuickBar({ categories, selectedCategoryId, onSelectCategory }: CategoryQuickBarProps) {
  if (!categories.length) {
    return null;
  }

  return (
    <div className="glass-panel flex items-center gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
      {categories.map(category => {
        const isActive = category.id === selectedCategoryId;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              'group relative flex h-12 shrink-0 items-center gap-2 rounded-2xl border px-4 text-sm transition-colors',
              isActive
                ? 'border-primary/40 bg-primary/15 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.25)]'
                : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white'
            )}
            aria-pressed={isActive}
            title={category.description || category.title}
          >
            <div className="flex flex-col items-start text-left">
              <span className="max-w-[160px] truncate font-medium">{category.title}</span>
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">#{category.slug || 'канал'}</span>
            </div>
            {category.unreadCount > 0 && (
              <span className="ml-auto flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-500/80 px-2 text-[11px] font-semibold text-white">
                {category.unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
