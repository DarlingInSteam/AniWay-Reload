import { cn } from '@/lib/utils'

interface MobileHintProps {
  visible: boolean
}

export const MobileHint = ({ visible }: MobileHintProps) => (
  <div
    className={cn(
      'fixed bottom-4 right-4 sm:hidden bg-black/85 backdrop-blur-md text-white text-[11px] leading-relaxed p-3 rounded-lg transition-all duration-300 border border-white/20 shadow-lg',
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
    )}
  >
    Тап по странице — скрыть/показать интерфейс
    <br />
    Быстрый двойной тап (без скролла) — лайк
  </div>
)
