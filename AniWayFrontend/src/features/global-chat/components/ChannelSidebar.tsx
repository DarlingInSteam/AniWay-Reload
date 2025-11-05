import { useEffect, useMemo, useRef, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CategoryView } from '@/types/social';

interface ChannelTabProps {
  category: CategoryView;
  isActive: boolean;
  onSelect: (categoryId: number) => void;
}

function ChannelTab({ category, isActive, onSelect }: ChannelTabProps) {
  const unread = category.unreadCount ?? 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(category.id)}
      title={category.description ? `${category.title} - ${category.description}` : category.title}
      role="tab"
      aria-selected={isActive}
      className={cn(
        'group relative inline-flex min-w-[140px] max-w-[220px] items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/40',
        isActive
          ? 'border border-primary/50 bg-primary/20 text-white'
          : 'border border-white/10 text-white/65 hover:border-white/20 hover:bg-white/5 hover:text-white'
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-medium leading-tight">{category.title}</span>
        {category.description && (
          <span className="truncate text-[11px] font-medium text-white/40">{category.description}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {category.isDefault && (
          <Badge
            variant="secondary"
            className="hidden rounded-full border border-white/20 bg-transparent px-2 py-0 text-[10px] text-white/70 md:inline-flex"
          >
            По умолчанию
          </Badge>
        )}
        {unread > 0 && (
          <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary/70 px-1 text-[11px] font-semibold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </div>
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-y-1 left-1.5 w-[3px] rounded-full bg-white/20 opacity-0 transition-opacity duration-200',
          isActive && 'opacity-100'
        )}
      />
    </button>
  );
}

function ChannelTabSkeleton() {
  return (
    <div className="inline-flex min-w-[140px] max-w-[220px] flex-col rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/40">
      <div className="h-3 w-24 animate-pulse rounded-full bg-white/15" />
      <div className="mt-2 h-2.5 w-32 animate-pulse rounded-full bg-white/10" />
    </div>
  );
}

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

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollShadows, setScrollShadows] = useState({ left: false, right: false });

  useEffect(() => {
    const node = scrollContainerRef.current;
    if (!node) {
      return;
    }

    const updateShadows = () => {
      const { scrollLeft, scrollWidth, clientWidth } = node;
      const maxScrollLeft = scrollWidth - clientWidth;
      setScrollShadows({
        left: scrollLeft > 4,
        right: maxScrollLeft > 4 && scrollLeft < maxScrollLeft - 4,
      });
    };

    updateShadows();
    node.addEventListener('scroll', updateShadows, { passive: true });
    window.addEventListener('resize', updateShadows);

    return () => {
      node.removeEventListener('scroll', updateShadows);
      window.removeEventListener('resize', updateShadows);
    };
  }, [visibleCategories.length]);

  return (
    <div className="sticky top-0.5 z-30 flex h-14 min-h-[56px] items-center gap-3 border-b border-white/12 bg-white/[0.03] px-3 sm:top-1 sm:px-4 !overflow-visible">
      <div className="hidden items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-white/40 lg:flex">
        <span>Каналы</span>
        <span className="text-white/30">·</span>
        <span>{categories.length}</span>
      </div>

      <div className="relative flex flex-1 items-center">
        <div
          ref={scrollContainerRef}
          role="tablist"
          aria-label="Список каналов"
          className="flex w-full items-center gap-2 overflow-x-auto scroll-smooth scrollbar-thin"
        >
          {loading && categories.length === 0 ? (
            <div className="flex items-center gap-3 text-xs text-white/60">
              <Loader2 className="h-4 w-4 animate-spin text-white/40" />
              Загрузка каналов…
            </div>
          ) : visibleCategories.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-white/50">
              <span>Нет каналов</span>
            </div>
          ) : (
            visibleCategories.map(category => (
              <ChannelTab key={category.id} category={category} isActive={selectedCategoryId === category.id} onSelect={onSelectCategory} />
            ))
          )}

          {loading && categories.length > 0 && (
            <div className="flex items-center gap-2">
              <ChannelTabSkeleton />
              <ChannelTabSkeleton />
            </div>
          )}
        </div>

        <div
          className={cn(
            'pointer-events-none absolute inset-y-1 left-0 w-8 bg-gradient-to-r from-[#101014] via-[#101014]/60 to-transparent transition-opacity duration-200',
            scrollShadows.left ? 'opacity-100' : 'opacity-0'
          )}
          aria-hidden="true"
        />
        <div
          className={cn(
            'pointer-events-none absolute inset-y-1 right-0 w-8 bg-gradient-to-l from-[#101014] via-[#101014]/60 to-transparent transition-opacity duration-200',
            scrollShadows.right ? 'opacity-100' : 'opacity-0'
          )}
          aria-hidden="true"
        />
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
              className="h-9 w-9 rounded-full border border-white/12 text-white/70 transition hover:border-white/25 hover:bg-transparent hover:text-white"
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
              <div className="flex items-center gap-2 rounded-xl border border-white/12 px-3 py-2">
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
    </div>
  );
}
