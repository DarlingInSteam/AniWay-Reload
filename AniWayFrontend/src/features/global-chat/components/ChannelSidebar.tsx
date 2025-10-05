import { useMemo } from 'react';
import {
  ArchiveRestore,
  Loader2,
  MessageSquare,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Undo2,
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CategoryView } from '@/types/social';

interface ChannelSidebarProps {
  categories: CategoryView[];
  filteredCategories: CategoryView[];
  loading: boolean;
  loadingMessages: boolean;
  selectedCategoryId: number | null;
  selectedCategory: CategoryView | null;
  hasSelectedCategory: boolean;
  hasMore: boolean;
  isAdmin: boolean;
  categoryQuery: string;
  onCategoryQueryChange: (value: string) => void;
  onSelectCategory: (categoryId: number) => void;
  onRefreshAll: () => void;
  onRefreshCategories: () => void;
  onRefreshMessages: () => void;
  onLoadOlderMessages: () => Promise<void>;
  onMarkSelectedCategoryRead: () => void;
  onOpenCreateCategory: () => void;
  onOpenEditCategory: () => void;
}

export function ChannelSidebar({
  categories,
  filteredCategories,
  loading,
  loadingMessages,
  selectedCategoryId,
  selectedCategory,
  hasSelectedCategory,
  hasMore,
  isAdmin,
  categoryQuery,
  onCategoryQueryChange,
  onSelectCategory,
  onRefreshAll,
  onRefreshCategories,
  onRefreshMessages,
  onLoadOlderMessages,
  onMarkSelectedCategoryRead,
  onOpenCreateCategory,
  onOpenEditCategory,
}: ChannelSidebarProps) {
  const visibleCategories = useMemo(() => {
    const query = categoryQuery.trim();
    return query ? filteredCategories : categories;
  }, [categories, filteredCategories, categoryQuery]);

  return (
    <GlassPanel
      padding="none"
      className="sticky top-2 z-30 flex h-14 min-h-[56px] items-center gap-3 px-3 sm:px-4 !overflow-visible"
    >
      <div className="hidden items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-white/40 lg:flex">
        <span>Каналы</span>
        <span className="text-white/30">·</span>
        <span>{categories.length}</span>
      </div>

      <div className="flex flex-1 items-center gap-2 overflow-x-auto scrollbar-thin">
        {loading && categories.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-white/60">
            <Loader2 className="h-4 w-4 animate-spin text-white/40" />
            Загрузка каналов…
          </div>
        ) : visibleCategories.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span>Нет каналов</span>
          </div>
        ) : (
          visibleCategories.map(category => {
            const isActive = selectedCategoryId === category.id;
            const unread = category.unreadCount ?? 0;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelectCategory(category.id)}
                className={cn(
                  'relative inline-flex min-w-[120px] max-w-[200px] items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors duration-200',
                  isActive
                    ? 'border-white/25 bg-white/15 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.2)]'
                    : 'border-transparent bg-white/5 text-white/65 hover:border-white/15 hover:bg-white/10 hover:text-white'
                )}
              >
                <span className="truncate">{category.title}</span>
                {category.isDefault && !isActive && (
                  <Badge variant="secondary" className="hidden rounded-full border-white/20 bg-white/10 px-2 py-0 text-[10px] text-white/70 md:inline-flex">
                    По умолчанию
                  </Badge>
                )}
                {unread > 0 && (
                  <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary/70 px-1 text-[11px] font-semibold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-2">
        {(loading || loadingMessages) && (
          <Loader2 className="h-4 w-4 animate-spin text-white/40" aria-hidden="true" />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Дополнительные действия"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[260px] space-y-3 border-white/10 bg-[#141417]/95 p-3 text-xs text-white/70 backdrop-blur-md"
          >
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">Поиск каналов</p>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <Search className="h-3.5 w-3.5 text-white/40" />
                <input
                  type="search"
                  value={categoryQuery}
                  onChange={event => onCategoryQueryChange(event.target.value)}
                  placeholder="Введите название…"
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
                />
              </div>
              {categoryQuery && (
                <button
                  type="button"
                  className="text-start text-[11px] uppercase tracking-[0.25em] text-white/40 transition hover:text-white"
                  onClick={() => onCategoryQueryChange('')}
                >
                  Сбросить фильтр
                </button>
              )}
            </div>

            <div className="space-y-1">
              <DropdownMenuItem className="gap-2 text-xs" onClick={onRefreshCategories}>
                <RefreshCcw className="h-3 w-3" />
                Обновить каналы
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs" onClick={onRefreshAll}>
                <RefreshCcw className="h-3 w-3 rotate-180" />
                Обновить всё
              </DropdownMenuItem>
              <DropdownMenuItem
                className={cn('gap-2 text-xs', !hasSelectedCategory && 'pointer-events-none opacity-50')}
                onClick={onRefreshMessages}
              >
                <MessageSquare className="h-3 w-3" />
                Обновить сообщения
              </DropdownMenuItem>
              <DropdownMenuItem
                className={cn('gap-2 text-xs', (!hasSelectedCategory || !hasMore) && 'pointer-events-none opacity-50')}
                onClick={onLoadOlderMessages}
              >
                <Undo2 className="h-3 w-3" />
                Ранние сообщения
              </DropdownMenuItem>
              <DropdownMenuItem
                className={cn(
                  'gap-2 text-xs',
                  (!hasSelectedCategory || (selectedCategory?.unreadCount ?? 0) === 0) && 'pointer-events-none opacity-50'
                )}
                onClick={onMarkSelectedCategoryRead}
              >
                <ArchiveRestore className="h-3 w-3" />
                Пометить прочитанным
              </DropdownMenuItem>
            </div>

            {isAdmin && (
              <div className="space-y-1 border-t border-white/10 pt-3">
                <DropdownMenuItem className="gap-2 text-xs" onClick={onOpenCreateCategory}>
                  <Plus className="h-3 w-3" />
                  Создать категорию
                </DropdownMenuItem>
                <DropdownMenuItem
                  className={cn('gap-2 text-xs', !hasSelectedCategory && 'pointer-events-none opacity-50')}
                  onClick={onOpenEditCategory}
                >
                  <Pencil className="h-3 w-3" />
                  Редактировать текущую
                </DropdownMenuItem>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </GlassPanel>
  );
}
