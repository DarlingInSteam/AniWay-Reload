import { MessageSquare, Hash, RefreshCcw, Plus, MoreVertical } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ChatPageHeaderProps {
  isAdmin: boolean;
  hasSelectedCategory: boolean;
  onOpenCreateCategory: () => void;
  onRefreshAll: () => void;
  onRefreshCategories: () => void;
  onRefreshMessages: () => void;
}

export function ChatPageHeader({
  isAdmin,
  hasSelectedCategory,
  onOpenCreateCategory,
  onRefreshAll,
  onRefreshCategories,
  onRefreshMessages,
}: ChatPageHeaderProps) {
  return (
    <GlassPanel padding="sm" className="mb-6 flex items-center justify-between gap-3 border-white/10 bg-white/5 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
        <MessageSquare className="h-4 w-4 text-primary/70" />
        Глобальный чат
      </div>
      <div className="flex items-center gap-1">
        {isAdmin && (
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 rounded-full text-white/70 hover:bg-white/10"
            onClick={onOpenCreateCategory}
            aria-label="Создать канал"
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full text-white/70 hover:bg-white/10"
              aria-label="Действия чата"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="gap-2 text-xs" onClick={onRefreshAll}>
              <RefreshCcw className="h-3 w-3" />
              Обновить всё
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 text-xs" onClick={onRefreshCategories}>
              <Hash className="h-3 w-3" />
              Обновить каналы
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn('gap-2 text-xs', !hasSelectedCategory && 'pointer-events-none opacity-50')}
              onClick={onRefreshMessages}
            >
              <MessageSquare className="h-3 w-3" />
              Обновить сообщения
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </GlassPanel>
  );
}
