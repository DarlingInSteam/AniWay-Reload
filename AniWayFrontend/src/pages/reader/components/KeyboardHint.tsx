import { cn } from '@/lib/utils'

interface KeyboardHintProps {
  visible: boolean
}

export const KeyboardHint = ({ visible }: KeyboardHintProps) => (
  <div
    className={cn(
      'fixed bottom-4 left-4 bg-black/80 backdrop-blur-sm text-white text-xs p-3 rounded-lg transition-all duration-300 border border-white/20 hidden md:block',
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
    )}
  >
    <div className="space-y-1">
      <div>ESC - Назад</div>
      <div>H - Показать/скрыть UI</div>
      <div>← → - Смена глав</div>
      <div>Двойной клик - Лайк</div>
    </div>
  </div>
)
