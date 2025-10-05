import { ArrowLeft, ArchiveRestore, Loader2, MoreVertical, Pencil, RefreshCcw, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CategoryView } from '@/types/social';

interface CategoryHeaderProps {
  category: CategoryView;
  hasMore: boolean;
  loadingMessages: boolean;
  onRefreshMessages: () => void;
  onLoadOlderMessages: () => void;
  onMarkSelectedCategoryRead: () => void;
  isAdmin: boolean;
  onOpenEditCategory: () => void;
  onBackToList: () => void;
  showBackButton: boolean;
}

export function CategoryHeader({
  category,
  hasMore,
  loadingMessages,
  onRefreshMessages,
  onLoadOlderMessages,
  onMarkSelectedCategoryRead,
  isAdmin,
  onOpenEditCategory,
  onBackToList,
  showBackButton,
}: CategoryHeaderProps) {
  const isUnread = category.unreadCount > 0;

  return (
  <div className="border-b border-white/5 bg-white/5 px-6 py-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              className="mt-1 h-9 w-9 rounded-full text-white/70 hover:bg-white/10 lg:hidden"
              onClick={onBackToList}
              aria-label="Вернуться к списку каналов"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold text-white">{category.title}</h2>
              {category.isDefault && (
                <Badge variant="secondary" className="border-primary/40 bg-primary/15 text-primary">
                  По умолчанию
                </Badge>
              )}
              {category.isArchived && (
                <Badge variant="outline" className="border-orange-400/40 text-orange-200">
                  Архив
                </Badge>
              )}
              {isUnread && (
                <Badge variant="outline" className="border-white/30 bg-white/5 text-white">
                  +{category.unreadCount} новых
                </Badge>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs uppercase tracking-[0.25em] text-white/40">
              <span>#{category.slug || 'канал'}</span>
            </div>
            {category.description && <p className="mt-3 max-w-2xl text-sm text-white/60">{category.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isUnread && (
            <Button
              variant="outline"
              size="sm"
              className="hidden gap-2 rounded-xl border-white/30 text-xs uppercase tracking-[0.2em] text-white/70 hover:border-white/50 hover:text-white lg:flex"
              onClick={onMarkSelectedCategoryRead}
            >
              <ArchiveRestore className="h-4 w-4" />
              Прочитать всё
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-white/70 hover:bg-white/10"
                aria-label="Действия канала"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 border-white/10 bg-[#1C1C1F]/95 backdrop-blur-sm">
              <DropdownMenuItem className="gap-2 text-xs" onClick={onRefreshMessages}>
                <RefreshCcw className="h-3 w-3" />
                Обновить сообщения
              </DropdownMenuItem>
              <DropdownMenuItem
                className={cn('gap-2 text-xs', !hasMore && 'pointer-events-none opacity-50')}
                onClick={onLoadOlderMessages}
              >
                {loadingMessages ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                Ранние сообщения
              </DropdownMenuItem>
              {isUnread && (
                <DropdownMenuItem className="gap-2 text-xs" onClick={onMarkSelectedCategoryRead}>
                  <ArchiveRestore className="h-3 w-3" />
                  Пометить прочитанным
                </DropdownMenuItem>
              )}
              {isAdmin && (
                <DropdownMenuItem className="gap-2 text-xs" onClick={onOpenEditCategory}>
                  <Pencil className="h-3 w-3" />
                  Редактировать категорию
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
