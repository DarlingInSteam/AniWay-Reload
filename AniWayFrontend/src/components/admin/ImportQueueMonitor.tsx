import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { RefreshCw, Clock, Play, CheckCircle, XCircle, AlertTriangle, FileText, Loader2, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import type { ImportQueueItem, ImportQueueStats, ImportQueueMonitorProps } from '@/types/importQueue'

const QUEUE_POLL_INTERVAL = 2000 // 2 секунды
const QUEUE_TIMEZONE = 'Asia/Novosibirsk'
const QUEUE_TZ_LABEL = 'НСК'

const getStatusIcon = (status: ImportQueueItem['status']) => {
  switch (status) {
    case 'QUEUED':
      return <Clock className="h-4 w-4 text-yellow-400" />
    case 'PROCESSING':
      return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
    case 'COMPLETED':
      return <CheckCircle className="h-4 w-4 text-green-400" />
    case 'FAILED':
      return <XCircle className="h-4 w-4 text-red-400" />
    case 'CANCELLED':
      return <AlertTriangle className="h-4 w-4 text-gray-400" />
    default:
      return <FileText className="h-4 w-4 text-gray-400" />
  }
}

const getStatusColor = (status: ImportQueueItem['status']) => {
  switch (status) {
    case 'QUEUED':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
    case 'PROCESSING':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'COMPLETED':
      return 'bg-green-500/20 text-green-300 border-green-500/30'
    case 'FAILED':
      return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'CANCELLED':
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  }
}

const getPriorityColor = (priority: ImportQueueItem['priority']) => {
  switch (priority) {
    case 'HIGH':
      return 'bg-red-500/20 text-red-300 border-red-500/30'
    case 'NORMAL':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    case 'LOW':
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  }
}

const formatDuration = (startTime?: string, endTime?: string) => {
  if (!startTime) return '—'
  
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : new Date()
  const durationMs = end.getTime() - start.getTime()
  
  if (durationMs < 1000) return '< 1s'
  if (durationMs < 60000) return `${Math.floor(durationMs / 1000)}s`
  if (durationMs < 3600000) return `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`
  return `${Math.floor(durationMs / 3600000)}h ${Math.floor((durationMs % 3600000) / 60000)}m`
}

const formatTime = (timestamp?: string) => {
  if (!timestamp) return '—'

  const isoWithZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(timestamp) ? timestamp : `${timestamp}Z`
  const date = new Date(isoWithZone)
  if (Number.isNaN(date.getTime())) {
    return timestamp
  }

  const formatted = date.toLocaleTimeString('ru-RU', {
    timeZone: QUEUE_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  return `${formatted} ${QUEUE_TZ_LABEL}`
}

export function ImportQueueMonitor({ isAutoParsing, className }: ImportQueueMonitorProps) {
  const [stats, setStats] = useState<ImportQueueStats | null>(null)
  const [activeImports, setActiveImports] = useState<ImportQueueItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cancellingTasks, setCancellingTasks] = useState<Set<string>>(new Set())

  const fetchQueueData = useCallback(async () => {
    try {
      setError(null)
      
      // Получаем статистику очереди
      const statsResponse = await fetch('/api/import-queue/stats')
      if (!statsResponse.ok) {
        throw new Error(`Failed to fetch stats: ${statsResponse.status}`)
      }
      const statsData = await statsResponse.json()
      setStats(statsData)
      
      // Получаем активные импорты
      const activeResponse = await fetch('/api/import-queue/active')
      if (!activeResponse.ok) {
        throw new Error(`Failed to fetch active imports: ${activeResponse.status}`)
      }
      const activeData = await activeResponse.json()
      setActiveImports(activeData)
      
    } catch (err) {
      console.error('Error fetching queue data:', err)
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    }
  }, [])

  const refreshData = useCallback(async () => {
    setIsRefreshing(true)
    await fetchQueueData()
    setIsRefreshing(false)
  }, [fetchQueueData])

  const cancelImport = useCallback(async (importTaskId: string) => {
    setCancellingTasks(prev => new Set(prev).add(importTaskId))
    
    try {
      const response = await fetch(`/api/import-queue/${importTaskId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to cancel import: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        toast.success(`Импорт "${importTaskId}" отменен`)
        // Сразу обновляем данные
        await fetchQueueData()
      } else {
        throw new Error(result.message || 'Не удалось отменить импорт')
      }
    } catch (err) {
      console.error('Error cancelling import:', err)
      const errorMessage = err instanceof Error ? err.message : 'Ошибка отмены импорта'
      setError(errorMessage)
      toast.error(`Не удалось отменить импорт: ${errorMessage}`)
    } finally {
      setCancellingTasks(prev => {
        const next = new Set(prev)
        next.delete(importTaskId)
        return next
      })
    }
  }, [fetchQueueData])

  // Автоматическое обновление когда идет автопарсинг
  useEffect(() => {
    if (!isAutoParsing) {
      return
    }

    setIsLoading(true)
    fetchQueueData().finally(() => setIsLoading(false))

    const interval = setInterval(fetchQueueData, QUEUE_POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [isAutoParsing, fetchQueueData])

  // Начальная загрузка
  useEffect(() => {
    setIsLoading(true)
    fetchQueueData().finally(() => setIsLoading(false))
  }, [fetchQueueData])

  const sortedImports = useMemo(() => {
    return [...activeImports].sort((a, b) => {
      // Сначала сортируем по статусу (активные вверху)
      const statusOrder = { PROCESSING: 0, QUEUED: 1, FAILED: 2, COMPLETED: 3, CANCELLED: 4 }
      const statusDiff = (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5)
      if (statusDiff !== 0) return statusDiff
      
      // Потом по приоритету
      const priorityOrder = { HIGH: 0, NORMAL: 1, LOW: 2 }
      const priorityDiff = (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
      if (priorityDiff !== 0) return priorityDiff
      
      // Потом по времени добавления в очередь
      return new Date(a.queuedAt).getTime() - new Date(b.queuedAt).getTime()
    })
  }, [activeImports])

  const avgImportTime = useMemo(() => {
    const completedImports = activeImports.filter(item => 
      item.status === 'COMPLETED' && item.startedAt && item.completedAt
    )
    
    if (completedImports.length === 0) return null
    
    const totalTime = completedImports.reduce((sum, item) => {
      const duration = new Date(item.completedAt!).getTime() - new Date(item.startedAt!).getTime()
      return sum + duration
    }, 0)
    
    return Math.round(totalTime / completedImports.length / 1000) // в секундах
  }, [activeImports])

  // Показываем компонент только если есть активность или идет автопарсинг
  if (!isAutoParsing && !activeImports.length && !stats?.queueSize && !stats?.activeImports) {
    return null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-blue-400" />
              Очередь импорта
            </CardTitle>
            <CardDescription>
              Мониторинг асинхронного импорта манги
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
            className="ml-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Ошибка загрузки данных очереди: {error}
            </AlertDescription>
          </Alert>
        )}

        {isLoading && !stats && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Загрузка данных очереди...</span>
          </div>
        )}

        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                <div className="text-sm text-blue-300 mb-1">В очереди</div>
                <div className="text-2xl font-bold text-blue-100">{stats.queueSize}</div>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                <div className="text-sm text-yellow-300 mb-1">Обрабатывается</div>
                <div className="text-2xl font-bold text-yellow-100">{stats.statusCounts?.PROCESSING || 0}</div>
              </div>
              <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                <div className="text-sm text-green-300 mb-1">Завершено</div>
                <div className="text-2xl font-bold text-green-100">{stats.statusCounts?.COMPLETED || 0}</div>
              </div>
              <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                <div className="text-sm text-red-300 mb-1">Ошибок</div>
                <div className="text-2xl font-bold text-red-100">{stats.statusCounts?.FAILED || 0}</div>
              </div>
            </div>
            
            {(stats.statusCounts?.PROCESSING || 0) > 0 && (
              <div className="bg-gradient-to-r from-blue-500/10 to-green-500/10 rounded-lg p-3 border border-blue-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-blue-300">Прогресс импорта</span>
                  <span className="text-xs text-gray-400">
                    {stats.statusCounts?.PROCESSING || 0} активных
                    {avgImportTime && ` • ~${avgImportTime}s среднее время`}
                  </span>
                </div>
                <Progress value={undefined} className="h-2 bg-blue-900/50" />
              </div>
            )}
          </>
        )}

        {sortedImports.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-white">Активные импорты</h4>
              <Badge variant="outline" className="text-xs">
                {sortedImports.length} из {stats?.activeImports || 0}
              </Badge>
            </div>
            
            <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
              {sortedImports.map((item) => (
                <div
                  key={item.importTaskId}
                  className="bg-white/5 rounded-lg p-3 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(item.status)}
                      <span className="text-sm font-medium text-white truncate max-w-48">
                        {item.slug}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs px-2 py-1 ${getPriorityColor(item.priority)}`}>
                        {item.priority}
                      </Badge>
                      <Badge className={`text-xs px-2 py-1 ${getStatusColor(item.status)}`}>
                        {item.status}
                      </Badge>
                      {item.status === 'QUEUED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelImport(item.importTaskId)}
                          disabled={cancellingTasks.has(item.importTaskId)}
                          className="h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-300"
                          title="Отменить импорт"
                        >
                          {cancellingTasks.has(item.importTaskId) ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                    <div>
                      <span className="text-gray-400">Добавлен:</span>
                      <span className="ml-1">{formatTime(item.queuedAt)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Длительность:</span>
                      <span className="ml-1">{formatDuration(item.startedAt, item.completedAt)}</span>
                    </div>
                  </div>
                  
                  {item.errorMessage && (
                    <div className="mt-2 text-xs text-red-300 bg-red-500/10 rounded p-2 border border-red-500/20">
                      {item.errorMessage}
                    </div>
                  )}
                  
                  {item.status === 'PROCESSING' && (
                    <div className="mt-2">
                      <Progress value={undefined} className="h-1" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && stats && sortedImports.length === 0 && stats.queueSize === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Очередь импорта пуста</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}