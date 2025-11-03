import { useState, useEffect, type CSSProperties } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, XCircle, Clock, Terminal, Minimize2, Maximize2 } from 'lucide-react'
import { useProgressWebSocket } from '@/hooks/useProgressWebSocket'
import type { ProgressData, LogMessage } from '@/types'

interface RealTimeProgressProps {
  taskId: string
  title: string
  onComplete?: (result: any) => void
  onError?: (error: string) => void
  onProgressUpdate?: (data: ProgressData) => void
  className?: string
  initialProgress?: ProgressData | null
  initialLogs?: LogMessage[]
  onLogMessage?: (log: LogMessage) => void
}

const ensureTimestamp = (value: number | string | undefined): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  return Date.now()
}

const normalizeLogMessage = (log: LogMessage | any): LogMessage => {
  if (!log || typeof log !== 'object') {
    return {
      level: 'INFO',
      message: String(log ?? ''),
      timestamp: Date.now()
    }
  }

  const level = typeof log.level === 'string' ? log.level.toUpperCase() : 'INFO'
  const message = typeof log.message === 'string' ? log.message : JSON.stringify(log.message ?? log)
  const timestamp = ensureTimestamp((log as any).timestamp ?? (log as any).created_at)

  return { level, message, timestamp }
}

const mergeLogs = (existing: LogMessage[], incoming: LogMessage[]): LogMessage[] => {
  if (incoming.length === 0) {
    return existing
  }

  const logMap = new Map<string, LogMessage>()

  const register = (log: LogMessage) => {
    const key = `${log.level}-${log.message}-${log.timestamp}`
    logMap.set(key, log)
  }

  existing.forEach(register)
  incoming.forEach(register)

  return Array.from(logMap.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-200)
}

export function RealTimeProgress({
  taskId,
  title,
  onComplete,
  onError,
  onProgressUpdate,
  className,
  initialProgress,
  initialLogs,
  onLogMessage
}: RealTimeProgressProps) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null)
  const [logs, setLogs] = useState<LogMessage[]>([])
  const [isMinimized, setIsMinimized] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const storageKey = `parser-progress:${taskId}`
  const floatingStyle: CSSProperties = {
    bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)'
  }

  const { isConnected, subscribeToTask, unsubscribeFromTask } = useProgressWebSocket({
    onProgress: (data) => {
      console.log('onProgress called:', data)
      if (data.task_id === taskId) {
        const merged: ProgressData = {
          task_id: data.task_id,
          status: data.status,
          progress: data.progress,
          message: data.message,
          updated_at: data.updated_at,
          result: data.result ?? progressData?.result,
          metrics: data.metrics ?? progressData?.metrics
        }

        setProgressData(merged)
        onProgressUpdate?.(merged)

        // Вызываем колбэки при завершении
        if (merged.status === 'completed' && onComplete) {
          console.log('onComplete called:', merged.result)
          onComplete(merged.result)
        } else if (merged.status === 'failed' && onError) {
          console.log('onError called:', merged.message)
          onError(merged.message)
        }
      }
    },
    onLog: (log) => {
      console.log('onLog called:', log)
      const normalized = normalizeLogMessage(log)
      setLogs(prev => mergeLogs(prev, [normalized]).slice(-100))
      onLogMessage?.(normalized)
    },
    onConnect: () => {
      if (taskId) {
        console.log('WebSocket connected, subscribing to task:', taskId)
      }
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !taskId) {
      return
    }

    try {
      const stored = window.localStorage.getItem(storageKey)
      if (!stored) {
        return
      }

      const parsed = JSON.parse(stored) as {
        progressData?: ProgressData | null
        logs?: LogMessage[]
      }

      if (parsed.progressData) {
        setProgressData(parsed.progressData)
      }

      if (parsed.logs && Array.isArray(parsed.logs)) {
        setLogs(parsed.logs.slice(-100).map(normalizeLogMessage))
      }
    } catch (error) {
      console.error('Не удалось восстановить прогресс задачи из localStorage:', error)
    }
  }, [storageKey, taskId])

  useEffect(() => {
    if (!initialProgress) {
      return
    }

    setProgressData(prev => {
      if (!prev) {
        return initialProgress
      }

      if (
        initialProgress.updated_at !== prev.updated_at ||
        initialProgress.status !== prev.status ||
        initialProgress.progress !== prev.progress ||
        initialProgress.message !== prev.message
      ) {
        return { ...prev, ...initialProgress }
      }

      return prev
    })
  }, [initialProgress])

  useEffect(() => {
    if (!initialLogs || initialLogs.length === 0) {
      return
    }

    setLogs(prev => mergeLogs(prev, initialLogs.map(normalizeLogMessage)))
  }, [initialLogs])

  useEffect(() => {
    if (typeof window === 'undefined' || !taskId) {
      return
    }

    if (!progressData && logs.length === 0) {
      window.localStorage.removeItem(storageKey)
      return
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        progressData,
        logs
      }))
    } catch (error) {
      console.error('Не удалось сохранить прогресс задачи в localStorage:', error)
    }
  }, [storageKey, taskId, progressData, logs])

  useEffect(() => {
    if (typeof window === 'undefined' || !taskId) {
      return
    }

    const status = progressData?.status?.toLowerCase?.()
    if (status === 'completed' || status === 'failed') {
      window.localStorage.removeItem(storageKey)
    }
  }, [storageKey, taskId, progressData?.status])

  useEffect(() => {
    if (isConnected && taskId) {
      subscribeToTask(taskId)
    }

    return () => {
      if (taskId) {
        unsubscribeFromTask(taskId)
      }
    }
  }, [isConnected, taskId, subscribeToTask, unsubscribeFromTask])

  const getStatusIcon = () => {
    if (!progressData) return <Clock className="h-4 w-4 text-yellow-500" />

    switch (progressData.status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = () => {
    if (!progressData) return 'bg-yellow-500'

    switch (progressData.status) {
      case 'pending':
        return 'bg-yellow-500'
      case 'running':
        return 'bg-blue-500'
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatLogLevel = (level: string) => {
    const colors = {
      INFO: 'text-blue-400',
      WARN: 'text-yellow-400',
      ERROR: 'text-red-400',
      DEBUG: 'text-gray-400'
    }
    return colors[level as keyof typeof colors] || 'text-gray-300'
  }

  if (isMinimized) {
    return (
      <div
        className={`fixed left-3 right-3 z-50 sm:left-auto sm:right-4 ${className}`}
        style={floatingStyle}
      >
        <Button
          onClick={() => setIsMinimized(false)}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-background/95 backdrop-blur-sm"
        >
          {getStatusIcon()}
          <span className="truncate max-w-32">{title}</span>
          {progressData && (
            <span className="text-xs">{progressData.progress}%</span>
          )}
          <Maximize2 className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <Card
      className={`fixed left-3 right-3 z-50 max-h-[80vh] w-auto max-w-lg bg-background/95 backdrop-blur-sm border-border sm:left-auto sm:right-4 sm:w-[24rem] ${className}`}
      style={floatingStyle}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setShowLogs(!showLogs)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <Terminal className="h-3 w-3" />
            </Button>
            <Button
              onClick={() => setIsMinimized(true)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {progressData && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{progressData.message}</span>
              <Badge className={`${getStatusColor()} text-xs`}>
                {progressData.status}
              </Badge>
            </div>
            <Progress value={progressData.progress} className="h-2" />
            <div className="text-xs text-muted-foreground text-right">
              {progressData.progress}%
            </div>
          </div>
        )}

        {!isConnected && (
          <div className="text-xs text-red-400 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            WebSocket отключен
          </div>
        )}
      </CardHeader>

      {showLogs && logs.length > 0 && (
        <CardContent className="pt-0">
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Логи процесса</span>
              <Button
                onClick={() => setLogs([])}
                variant="ghost"
                size="sm"
                className="h-5 text-xs"
              >
                Очистить
              </Button>
            </div>
            <div className="h-32 w-full rounded border bg-black/20 p-2 overflow-auto sm:h-40">
              <div className="space-y-1 font-mono text-xs">
                {logs.slice(-20).map((log, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="text-gray-500 shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`shrink-0 ${formatLogLevel(log.level)}`}>
                      [{log.level}]
                    </span>
                    <span className="text-gray-300 break-all">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
