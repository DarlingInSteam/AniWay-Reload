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
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/10 px-6 py-5">
      <div className="flex items-start gap-3">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-white/70 hover:bg-white/10 lg:hidden"
            onClick={onBackToList}
            aria-label="Вернуться к списку каналов"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div>
          <h2 className="text-xl font-semibold text-white">{category.title}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/50">
            <span>#{category.slug || 'канал'}</span>
            {category.isArchived && (
              <Badge variant="outline" className="border-orange-400/40 text-orange-200">
                Архив
              </Badge>
            )}
          </div>
          {category.description && (
            <p className="mt-2 max-w-xl text-xs text-white/60">{category.description}</p>
          )}
        </div>
      </div>
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
        <DropdownMenuContent align="end">
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
          {category.unreadCount > 0 && (
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
  );
}
