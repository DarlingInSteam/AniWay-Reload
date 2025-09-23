import { ReactNode } from 'react'

interface ModerationDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  widthClass?: string
}

export function ModerationDrawer({ open, onClose, title, children, widthClass='max-w-md' }: ModerationDrawerProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative h-full w-full ${widthClass} glass-panel p-5 overflow-y-auto animate-slide-in`}> 
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Закрыть" className="px-2 py-1 text-sm rounded-md hover:bg-white/10">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}
