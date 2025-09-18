import React from 'react'
import { Search, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  onReset?: () => void
  title?: string
  description?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onReset, title = 'Ничего не найдено', description = 'Попробуйте изменить или сбросить фильтры.' }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4 w-full animate-fade-in">
      <div className="h-16 w-16 rounded-full flex items-center justify-center bg-white/5 border border-white/10 mb-6">
        <Search className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">{description}</p>
      {onReset && (
        <Button onClick={onReset} variant="outline" className="h-9 bg-white/5 border-white/15 text-sm hover:bg-white/10">
          <RotateCcw className="h-4 w-4 mr-2" /> Сбросить фильтры
        </Button>
      )}
    </div>
  )
}

export default EmptyState
