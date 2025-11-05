import { MessageSquare, Hash, RefreshCcw, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ChatPageHeaderProps {
  hasSelectedCategory: boolean;
  onRefreshAll: () => void;
  onRefreshCategories: () => void;
  onRefreshMessages: () => void;
}

export function ChatPageHeader({ hasSelectedCategory, onRefreshAll, onRefreshCategories, onRefreshMessages }: ChatPageHeaderProps) {
  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-8 md:flex-row md:items-start md:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
          <MessageSquare className="h-4 w-4 text-primary" />
          Глобальный чат
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-white">Живые обсуждения сообщества AniWay</h1>
        <p className="mt-2 max-w-3xl text-sm text-white/60">
          Общайтесь с читателями, делитесь находками и подключайтесь к нужной категории в один клик. Всё в стиле
          AniWay без лишнего визуального шума.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 self-stretch md:flex-col md:self-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 rounded-xl border-white/20 bg-white/5 text-[11px] uppercase tracking-[0.25em] text-white/70 hover:border-white/40 hover:text-white"
            >
              <MoreVertical className="h-4 w-4" /> Действия
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 border-white/10 bg-[#1C1C1F]/95 backdrop-blur-sm">
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
    </div>
  );
}
