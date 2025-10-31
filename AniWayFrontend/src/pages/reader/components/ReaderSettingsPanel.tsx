import { Eye, X, ZoomIn, ZoomOut } from 'lucide-react'
import { cn } from '@/lib/utils'

type ImageWidth = 'fit' | 'full' | 'wide'
type ReadingMode = 'vertical' | 'horizontal'

interface ReaderSettingsPanelProps {
  isOpen: boolean
  readingMode: ReadingMode
  imageWidth: ImageWidth
  showUI: boolean
  onClose: () => void
  onToggleReadingMode: () => void
  onCycleImageWidth: () => void
  onToggleUI: () => void
}

export const ReaderSettingsPanel = ({
  isOpen,
  readingMode,
  imageWidth,
  showUI,
  onClose,
  onToggleReadingMode,
  onCycleImageWidth,
  onToggleUI
}: ReaderSettingsPanelProps) => {
  if (!isOpen) return null

  const renderImageWidthIcon = () => {
    if (imageWidth === 'fit') return <ZoomIn className="h-5 w-5 text-primary" />
    if (imageWidth === 'full') return <ZoomOut className="h-5 w-5 text-primary" />
    return <ZoomOut className="h-5 w-5 text-red-400" />
  }

  return (
    <div
      className={cn(
        'settings-panel z-40 animate-fade-in fixed',
        'hidden md:block md:top-1/2 md:-translate-y-1/2 md:right-[84px] md:rounded-2xl md:min-w-[250px] md:max-w-[280px]',
        'md:border md:border-white/15 md:bg-gradient-to-br md:from-white/10 md:via-white/5 md:to-white/5 md:shadow-xl',
        'md:translate-x-0',
        'bg-black/85 md:bg-black/60 backdrop-blur-2xl',
        'bottom-0 left-0 right-0 md:bottom-auto md:left-auto',
        'p-5 pt-4 md:p-5'
      )}
    >
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-between mb-3 md:mb-4">
          <h3 className="text-white font-semibold text-base md:text-sm tracking-wide">Настройки чтения</h3>
          <button
            onClick={onClose}
            className="md:hidden p-2 -m-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
            aria-label="Закрыть настройки"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-2">
          <button
            onClick={onToggleReadingMode}
            className="w-full text-left text-sm text-muted-foreground hover:text-white transition-colors p-2 rounded hover:bg-secondary"
          >
            <div className="flex items-center justify-between">
              <span>Режим чтения</span>
              {readingMode === 'vertical' ? (
                <Eye className="h-5 w-5 text-primary" />
              ) : (
                <Eye className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </button>
          <button
            onClick={onCycleImageWidth}
            className="w-full text-left text-sm text-muted-foreground hover:text-white transition-colors p-2 rounded hover:bg-secondary group"
          >
            <div className="flex items-center justify-between">
              <span className="flex flex-col">
                <span>Размер изображений</span>
                <span className="text-[10px] uppercase tracking-wide text-primary/70 mt-0.5">
                  {imageWidth === 'fit' && 'FIT'}
                  {imageWidth === 'full' && 'FULL'}
                  {imageWidth === 'wide' && 'WIDE'}
                </span>
              </span>
              {renderImageWidthIcon()}
            </div>
          </button>
          <button
            onClick={onToggleUI}
            className="w-full text-left text-sm text-muted-foreground hover:text-white transition-colors p-2 rounded hover:bg-secondary"
          >
            {showUI ? 'Скрыть UI' : 'Показать UI'}
          </button>
        </div>
        <div className="md:hidden mt-5 pt-2">
          <div className="h-1 w-10 mx-auto rounded-full bg-white/20" />
        </div>
      </div>
    </div>
  )
}
