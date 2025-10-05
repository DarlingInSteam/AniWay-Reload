import { useState } from 'react';
import { Hash, MessageSquare, MoreVertical, Pencil, Plus, RefreshCcw, Search, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CategoryView } from '@/types/social';

interface ChannelSidebarProps {
  categories: CategoryView[];
  filteredCategories: CategoryView[];
  loading: boolean;
  selectedCategoryId: number | null;
  showSidebar: boolean;
  hasSelectedCategory: boolean;
  isAdmin: boolean;
  categoryQuery: string;
  onCategoryQueryChange: (value: string) => void;
  onSelectCategory: (categoryId: number) => void;
  onNavigateToFeed: () => void;
  onRefreshCategories: () => void;
  onRefreshMessages: () => void;
  onOpenCreateCategory: () => void;
  onOpenEditCategory: () => void;
}

export function ChannelSidebar({
  categories,
  filteredCategories,
  loading,
  selectedCategoryId,
  showSidebar,
  hasSelectedCategory,
  isAdmin,
  categoryQuery,
  onCategoryQueryChange,
  onSelectCategory,
  onNavigateToFeed,
  onRefreshCategories,
  onRefreshMessages,
  onOpenCreateCategory,
  onOpenEditCategory,
}: ChannelSidebarProps) {
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  return (
    <GlassPanel
      padding="none"
      className={cn(
        'flex min-h-0 flex-col overflow-hidden',
        showSidebar ? 'flex' : 'hidden',
        'lg:flex lg:w-[320px] xl:w-[360px] lg:h-full'
      )}
    >
      <div className="border-b border-white/5 px-5 pb-5 pt-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">
              <Hash className="h-4 w-4 text-primary/80" />
              Каналы
            </div>
            <p className="mt-3 text-sm text-white/60">
              Выбирайте категории, следите за активностью и возвращайтесь к обсуждениям в любой момент.
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl border border-white/0 text-white/70 hover:border-white/10 hover:bg-white/10"
                aria-label="Действия каналов"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 border-white/10 bg-[#1C1C1F]/95 backdrop-blur-sm">
              <DropdownMenuItem className="gap-2 text-xs" onClick={onRefreshCategories}>
                <RefreshCcw className="h-3 w-3" />
                Обновить списки
              </DropdownMenuItem>
              <DropdownMenuItem
                className={cn('gap-2 text-xs', !hasSelectedCategory && 'pointer-events-none opacity-50')}
                onClick={onRefreshMessages}
              >
                <MessageSquare className="h-3 w-3" />
                Обновить чат
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="px-5 pt-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input
            type="search"
            value={categoryQuery}
            onChange={event => onCategoryQueryChange(event.target.value)}
            placeholder="Поиск канала"
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white placeholder:text-white/40 focus:border-primary/50 focus:bg-white/10 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-5 pb-3 pt-4 text-[11px] uppercase tracking-[0.3em] text-white/40">
        <span>Всего: {categories.length}</span>
        <span>Показано: {filteredCategories.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-5 scrollbar-thin">
        {loading && categories.length === 0 ? (
          <div className="flex items-center justify-center py-10">
            <LoadingSpinner />
          </div>
        ) : categories.length === 0 ? (
          <div className="glass-panel mt-6 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-xs text-white/60">
            Категории ещё не созданы.
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="glass-panel mt-6 rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-center text-xs text-white/60">
            Ничего не найдено. Попробуйте изменить запрос.
          </div>
        ) : (
          <ul className="space-y-2">
            {filteredCategories.map(category => {
              const isActive = selectedCategoryId === category.id;
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCategory(category.id);
                      onNavigateToFeed();
                    }}
                    className={cn(
                      'w-full rounded-2xl border px-4 py-3 text-left transition backdrop-blur-md',
                      isActive
                        ? 'border-primary/40 bg-primary/15 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.25)]'
                        : 'border-white/10 bg-white/5 text-white/85 hover:border-white/20 hover:bg-white/10'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-white">{category.title}</p>
                          {category.isDefault && (
                            <Badge variant="secondary" className="border-primary/30 bg-primary/15 text-primary">
                              По умолчанию
                            </Badge>
                          )}
                          {category.isArchived && (
                            <Badge variant="outline" className="border-orange-400/40 text-orange-200">
                              Архив
                            </Badge>
                          )}
                        </div>
                        {category.description && (
                          <p className="mt-1 truncate text-xs text-white/60">{category.description}</p>
                        )}
                      </div>
                      {category.unreadCount > 0 && (
                        <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-red-500/80 px-2 text-[11px] font-semibold text-white">
                          {category.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {isAdmin && (
        <div className="border-t border-white/5 px-5 pb-4 pt-3">
          <button
            type="button"
            onClick={() => setIsAdminPanelOpen(prev => !prev)}
            className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-[0.25em] text-white/70 transition hover:border-white/20 hover:text-white"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Управление
            </span>
            <ChevronDown
              className={cn('h-4 w-4 transition-transform', isAdminPanelOpen ? 'rotate-180 text-white' : 'text-white/60')}
            />
          </button>
          <div
            className={cn(
              'grid transition-all duration-300 ease-out',
              isAdminPanelOpen ? 'mt-3 grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            )}
          >
            <div className="overflow-hidden">
              <div className="space-y-2 text-sm text-white/70">
                <button
                  type="button"
                  onClick={onOpenCreateCategory}
                  className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <Plus className="h-4 w-4" />
                  Создать категорию
                </button>
                <button
                  type="button"
                  onClick={onOpenEditCategory}
                  disabled={!hasSelectedCategory}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/10 hover:text-white',
                    !hasSelectedCategory && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <Pencil className="h-4 w-4" />
                  Редактировать выбранную
                </button>
                <button
                  type="button"
                  onClick={onRefreshCategories}
                  className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Обновить список
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </GlassPanel>
  );
}
