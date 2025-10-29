import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArchiveRestore,
  Loader2,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Undo2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CategoryView } from '@/types/social';

interface MobileChannelDrawerProps {
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
  onClose: () => void;
}

export function MobileChannelDrawer({
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
  onClose,
}: MobileChannelDrawerProps) {
  const visibleCategories = useMemo(() => {
    const query = categoryQuery.trim();
    return query ? filteredCategories : categories;
  }, [categories, filteredCategories, categoryQuery]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const handleSelect = (categoryId: number) => {
    onSelectCategory(categoryId);
    onClose();
  };

  const isMarkReadDisabled = !hasSelectedCategory || (selectedCategory?.unreadCount ?? 0) === 0;
  const isLoadOlderDisabled = !hasSelectedCategory || !hasMore;
  const isRefreshMessagesDisabled = !hasSelectedCategory;

  return (
    <motion.div
      key="mobile-channel-drawer"
      className="fixed inset-0 z-50 flex lg:hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Закрыть список каналов"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      <motion.aside
        className="relative z-10 flex h-full w-[min(85vw,360px)] flex-col border-r border-white/10 bg-[#121215] shadow-2xl"
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 pb-4 pt-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-white/35">Каналы</p>
            <p className="mt-1 text-xs text-white/55">{categories.length} доступно</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full border border-white/15 text-white/70 hover:border-white/30 hover:bg-transparent hover:text-white"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-2 rounded-xl border border-white/12 px-3 py-2">
            <Search className="h-4 w-4 text-white/45" />
            <input
              type="search"
              value={categoryQuery}
              onChange={event => onCategoryQueryChange(event.target.value)}
              placeholder="Найти канал"
              className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
            />
          </div>
          {categoryQuery && (
            <button
              type="button"
              className="text-left text-[11px] uppercase tracking-[0.25em] text-white/45 transition hover:text-white"
              onClick={() => onCategoryQueryChange('')}
            >
              Сбросить
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-4">
          {loading && categories.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-10 text-xs text-white/60">
              <Loader2 className="h-4 w-4 animate-spin text-white/40" />
              Загрузка каналов…
            </div>
          ) : visibleCategories.length === 0 ? (
            <p className="px-2 text-sm text-white/50">Каналы не найдены</p>
          ) : (
            <div className="space-y-2">
              {visibleCategories.map(category => {
                const isActive = selectedCategoryId === category.id;
                const unread = category.unreadCount ?? 0;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleSelect(category.id)}
                    className={cn(
                      'w-full rounded-xl border border-transparent bg-white/[0.03] px-3 py-3 text-left transition-all duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-white/50',
                      isActive
                        ? 'border-primary/40 bg-primary/15 shadow-[0_0_0_1px_rgba(120,141,255,0.25)] text-white'
                        : 'text-white/70 hover:border-white/20 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{category.title}</span>
                      {unread > 0 && (
                        <span className="ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-primary/80 px-2 text-[11px] font-semibold text-white">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                    {category.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-white/50">{category.description}</p>
                    )}
                    {category.isDefault && (
                      <div className="mt-2 inline-flex items-center gap-1">
                        <Badge
                          variant="secondary"
                          className="rounded-full border border-white/20 bg-transparent px-2 py-0 text-[10px] text-white/65"
                        >
                          По умолчанию
                        </Badge>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-white/10 px-4 py-4 text-xs text-white/70">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">Действия</p>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/5 hover:text-white"
              onClick={onRefreshCategories}
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Обновить каналы
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/5 hover:text-white"
              onClick={onRefreshAll}
            >
              <RefreshCcw className="h-3.5 w-3.5 rotate-180" /> Обновить всё
            </button>
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/5 hover:text-white',
                isRefreshMessagesDisabled && 'pointer-events-none opacity-50'
              )}
              onClick={onRefreshMessages}
            >
              <MessageSquare className="h-3.5 w-3.5" /> Обновить сообщения
            </button>
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/5 hover:text-white',
                isLoadOlderDisabled && 'pointer-events-none opacity-50'
              )}
              onClick={() => {
                if (!isLoadOlderDisabled) {
                  void onLoadOlderMessages();
                }
              }}
            >
              <Undo2 className="h-3.5 w-3.5" /> Ранние сообщения
            </button>
            <button
              type="button"
              className={cn(
                'flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/5 hover:text-white',
                isMarkReadDisabled && 'pointer-events-none opacity-50'
              )}
              onClick={onMarkSelectedCategoryRead}
            >
              <ArchiveRestore className="h-3.5 w-3.5" /> Пометить прочитанным
            </button>
            {(loading || loadingMessages) && (
              <div className="flex items-center gap-2 text-[11px] text-white/60">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-white/35" />
                Обновление в процессе…
              </div>
            )}
          </div>

          {isAdmin && (
            <div className="space-y-2 border-t border-white/10 pt-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/35">Администрирование</p>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                onClick={onOpenCreateCategory}
              >
                <Plus className="h-3.5 w-3.5" /> Создать категорию
              </button>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/5 hover:text-white',
                  !hasSelectedCategory && 'pointer-events-none opacity-50'
                )}
                onClick={onOpenEditCategory}
              >
                <Pencil className="h-3.5 w-3.5" /> Редактировать текущую
              </button>
            </div>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
}
