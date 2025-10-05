import { cn } from '@/lib/utils';

interface ChatMobileToggleProps {
  showList: boolean;
  showFeed: boolean;
  hasSelectedCategory: boolean;
  onShowList: () => void;
  onShowFeed: () => void;
}

export function ChatMobileToggle({ showList, showFeed, hasSelectedCategory, onShowList, onShowFeed }: ChatMobileToggleProps) {
  return (
    <div className="mb-4 flex items-center justify-between lg:hidden">
      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">Глобальный чат</div>
      <div className="glass-inline flex items-center rounded-full border border-white/10 bg-white/5 p-0.5">
        <button
          type="button"
          onClick={onShowList}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition',
            showList ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white/80'
          )}
        >
          Каналы
        </button>
        <button
          type="button"
          onClick={onShowFeed}
          disabled={!hasSelectedCategory}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition',
            showFeed ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white/80',
            !hasSelectedCategory && 'cursor-not-allowed opacity-40 hover:text-white/60'
          )}
        >
          Чат
        </button>
      </div>
    </div>
  );
}
