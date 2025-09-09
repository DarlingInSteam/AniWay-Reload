import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';

interface ApiErrorProps {
  error: string;
  onRetry?: () => void;
  showRetry?: boolean;
  variant?: 'default' | 'minimal' | 'card';
  className?: string;
}

export function ApiError({ 
  error, 
  onRetry, 
  showRetry = true, 
  variant = 'default',
  className = '' 
}: ApiErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const getErrorMessage = (error: string): { message: string; isConnectionError: boolean } => {
    const lowerError = error.toLowerCase();
    
    if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('connection')) {
      return {
        message: 'Проблемы с подключением к серверу. Проверьте интернет-соединение.',
        isConnectionError: true
      };
    }
    
    if (lowerError.includes('401') || lowerError.includes('unauthorized')) {
      return {
        message: 'Необходимо авторизоваться для доступа к этим данным.',
        isConnectionError: false
      };
    }
    
    if (lowerError.includes('403') || lowerError.includes('forbidden')) {
      return {
        message: 'У вас нет прав доступа к этим данным.',
        isConnectionError: false
      };
    }
    
    if (lowerError.includes('404')) {
      return {
        message: 'Запрашиваемые данные не найдены.',
        isConnectionError: false
      };
    }
    
    if (lowerError.includes('500') || lowerError.includes('server error')) {
      return {
        message: 'Ошибка сервера. Попробуйте позже.',
        isConnectionError: false
      };
    }
    
    return {
      message: error || 'Произошла неизвестная ошибка',
      isConnectionError: false
    };
  };

  const { message, isConnectionError } = getErrorMessage(error);

  if (variant === 'minimal') {
    return (
      <div className={`text-center py-4 ${className}`}>
        <div className="flex items-center justify-center gap-2 text-red-400 text-sm mb-2">
          {isConnectionError ? (
            <WifiOff className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>{message}</span>
        </div>
        {showRetry && onRetry && (
          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleRetry}
            disabled={isRetrying}
            className="text-red-400 hover:text-red-300 hover:bg-red-950/20"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Повторяем...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 mr-1" />
                Повторить
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`bg-red-950/20 border border-red-800/30 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          {isConnectionError ? (
            <WifiOff className="w-5 h-5 text-red-400 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="text-red-300 text-sm mb-2">{message}</p>
            {showRetry && onRetry && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleRetry}
                disabled={isRetrying}
                className="border-red-600 text-red-400 hover:bg-red-950/30"
              >
                {isRetrying ? (
                  <>
                    <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                    Повторяем...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Попробовать снова
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Alert className={`border-red-800/30 bg-red-950/20 ${className}`}>
      <AlertTriangle className="h-4 w-4 text-red-400" />
      <AlertDescription className="text-red-300">
        <div className="mb-2">{message}</div>
        {showRetry && onRetry && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleRetry}
            disabled={isRetrying}
            className="border-red-600 text-red-400 hover:bg-red-950/30"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                Повторяем...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 mr-2" />
                Попробовать снова
              </>
            )}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Компонент для отображения состояния загрузки с возможностью отмены
interface LoadingStateProps {
  message?: string;
  onCancel?: () => void;
  className?: string;
}

export function LoadingState({ 
  message = 'Загружаем данные...', 
  onCancel,
  className = '' 
}: LoadingStateProps) {
  return (
    <div className={`text-center py-6 ${className}`}>
      <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span>{message}</span>
      </div>
      {onCancel && (
        <Button 
          size="sm" 
          variant="ghost"
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-400"
        >
          Отмена
        </Button>
      )}
    </div>
  );
}

// Компонент для отображения пустого состояния
interface EmptyStateProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({ 
  title, 
  description, 
  action, 
  icon,
  className = '' 
}: EmptyStateProps) {
  return (
    <div className={`text-center py-8 text-gray-400 ${className}`}>
      {icon && <div className="mb-4">{icon}</div>}
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      {description && <p className="text-sm mb-4">{description}</p>}
      {action && (
        <Button 
          onClick={action.onClick}
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
