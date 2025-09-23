import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message = 'Ошибка загрузки каталога', onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4 w-full animate-fade-in">
      <div className="h-16 w-16 rounded-full flex items-center justify-center bg-red-500/10 border border-red-500/30 mb-6">
        <AlertTriangle className="h-8 w-8 text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{message}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">Проверьте подключение или попробуйте ещё раз.</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="h-9 bg-white/5 border-white/15 text-sm hover:bg-white/10">
          <RefreshCw className="h-4 w-4 mr-2" /> Повторить
        </Button>
      )}
    </div>
  )
}

export default ErrorState
