import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, Download, CheckCircle, XCircle, Clock, Loader2, RefreshCw, ExternalLink } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { RealTimeProgress } from '@/components/common/RealTimeProgress'
import type { ParsingMetrics, ProgressData, LogMessage } from '@/types'

interface ParsedManga {
  filename: string
  title: string
  author: string
  chaptersCount: number
  size: string
  createdAt: string
  branches?: string[]
}

interface ParsingTask {
  taskId: string
  slug: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  stage: string
  error?: string
  startTime: Date
  endTime?: Date
  result?: any
  metrics?: ParsingMetrics
  logs?: LogMessage[]
}

interface TaskSummary {
  taskId: string
  status: ParsingTask['status']
  slug?: string
  message?: string
  progress?: number
  createdAt?: string
  updatedAt?: string
}

const MANUAL_TASKS_STORAGE_KEY = 'manualParsingTasks'
const FINAL_STATUSES = new Set<ParsingTask['status']>(['completed', 'failed'])

const ensureTimestamp = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) {
      return parsed
    }
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime()
  }

  return Date.now()
}

const normalizeTaskStatus = (
  status: unknown,
  fallback: ParsingTask['status'] = 'pending'
): ParsingTask['status'] => {
  if (typeof status !== 'string') {
    return fallback
  }

  const normalized = status.trim().toUpperCase()

  if (normalized === 'PENDING') return 'pending'
  if (normalized === 'RUNNING') return 'running'
  if (normalized === 'COMPLETED' || normalized === 'SUCCESS' || normalized === 'DONE') return 'completed'
  if (normalized === 'FAILED' || normalized === 'ERROR' || normalized === 'CANCELLED') return 'failed'

  if (
    normalized.includes('RUNNING') ||
    normalized.startsWith('IMPORT') ||
    normalized.startsWith('PARSE') ||
    normalized.startsWith('BUILD') ||
    normalized.startsWith('DOWNLOAD')
  ) {
    return 'running'
  }

  return fallback
}

const normalizeLogEntries = (entries: unknown): LogMessage[] => {
  if (!Array.isArray(entries)) {
    return []
  }

  return entries
    .map((entry): LogMessage | null => {
      if (!entry || typeof entry !== 'object') {
        return null
      }

      const level = typeof (entry as any).level === 'string'
        ? (entry as any).level.toUpperCase()
        : 'INFO'

      const messageValue = (entry as any).message
      const message = typeof messageValue === 'string'
        ? messageValue
        : JSON.stringify(messageValue ?? entry)

      const timestampValue = (entry as any).timestamp ?? (entry as any).created_at ?? (entry as any).time
      const timestamp = ensureTimestamp(timestampValue)

      return { level, message, timestamp }
    })
    .filter((log): log is LogMessage => log !== null)
    .sort((a, b) => a.timestamp - b.timestamp)
}

const mergeLogArrays = (existing: LogMessage[] = [], incoming: LogMessage[] = []): LogMessage[] => {
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

const extractPrimaryResult = (payload: any) => {
  if (!payload) {
    return undefined
  }

  if (payload.result && typeof payload.result === 'object') {
    return payload.result
  }

  if (Array.isArray(payload.results) && payload.results.length > 0) {
    return payload.results[payload.results.length - 1]
  }

  return undefined
}

const selectSlug = (...values: Array<unknown>): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim()
    }
  }
  return undefined
}

export function MangaParser() {
  const [slug, setSlug] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentTask, setCurrentTask] = useState<ParsingTask | null>(null)
  const [parsedManga, setParsedManga] = useState<ParsedManga[]>([])
  const [taskSummaries, setTaskSummaries] = useState<TaskSummary[]>([])
  const [manualTaskIds, setManualTaskIds] = useState<string[]>([])
  const [manualIdsInitialized, setManualIdsInitialized] = useState(false)

  const persistManualTaskIds = useCallback((ids: string[]) => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      window.localStorage.setItem(MANUAL_TASKS_STORAGE_KEY, JSON.stringify(ids))
    } catch (error) {
      console.error('Не удалось сохранить список ручных задач парсинга:', error)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      setManualIdsInitialized(true)
      return
    }

    try {
      const stored = window.localStorage.getItem(MANUAL_TASKS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter((value): value is string => typeof value === 'string')
          setManualTaskIds(Array.from(new Set(filtered)))
        }
      }
    } catch (error) {
      console.error('Не удалось загрузить список ручных задач парсинга из localStorage:', error)
      window.localStorage.removeItem(MANUAL_TASKS_STORAGE_KEY)
    } finally {
      setManualIdsInitialized(true)
    }
  }, [])

  const registerManualTaskId = useCallback((taskId: string) => {
    setManualTaskIds(prev => {
      if (prev.includes(taskId)) {
        return prev
      }
      const next = [...prev, taskId]
      persistManualTaskIds(next)
      return next
    })
  }, [persistManualTaskIds])

  const unregisterManualTaskId = useCallback((taskId: string) => {
    setManualTaskIds(prev => {
      if (!prev.includes(taskId)) {
        return prev
      }
      const next = prev.filter(id => id !== taskId)
      persistManualTaskIds(next)
      return next
    })
  }, [persistManualTaskIds])

  const applyTaskPayload = useCallback((taskId: string, payload: any, fallbackSlug?: string) => {
    const logs = normalizeLogEntries(payload?.logs)
    const status = normalizeTaskStatus(payload?.status, 'pending')
    const resultPayload = extractPrimaryResult(payload)
    const slugCandidate = selectSlug(
      payload?.slug,
      payload?.current_slug,
      resultPayload?.filename,
      payload?.result?.filename,
      fallbackSlug
    )
    const createdAt = typeof payload?.created_at === 'string' ? payload.created_at : undefined
    const updatedAt = typeof payload?.updated_at === 'string' ? payload.updated_at : undefined

    setCurrentTask(prevState => {
      const prev = prevState && prevState.taskId === taskId ? prevState : null
      const mergedLogs = mergeLogArrays(prev?.logs ?? [], logs)
      const progressValue = typeof payload?.progress === 'number' ? payload.progress : prev?.progress ?? 0
      const stageMessage = typeof payload?.message === 'string' ? payload.message : prev?.stage ?? '—'
      const errorMessage = typeof payload?.error === 'string' ? payload.error : prev?.error
      const metricsPayload: ParsingMetrics | undefined =
        (payload?.metrics as ParsingMetrics | undefined) ??
        (resultPayload?.metrics as ParsingMetrics | undefined) ??
        prev?.metrics

      const normalizedStatus = normalizeTaskStatus(payload?.status, prev?.status ?? status)
      const startTime = prev?.startTime ?? (createdAt ? new Date(createdAt) : new Date())
      const isFinished = normalizedStatus === 'completed' || normalizedStatus === 'failed'
      const endTime = isFinished
        ? (updatedAt ? new Date(updatedAt) : prev?.endTime ?? new Date())
        : prev?.endTime
      const resolvedSlug = selectSlug(slugCandidate, prev?.slug, fallbackSlug, `Задача ${taskId}`) ?? `Задача ${taskId}`

      return {
        taskId,
        slug: resolvedSlug,
        status: normalizedStatus,
        progress: progressValue,
        stage: stageMessage,
        error: errorMessage,
        startTime,
        endTime,
        result: resultPayload ?? prev?.result,
        metrics: metricsPayload,
        logs: mergedLogs
      }
    })

    setTaskSummaries(prev => {
      const filtered = prev.filter(item => item.taskId !== taskId)
      const summary: TaskSummary = {
        taskId,
        status,
        slug: selectSlug(slugCandidate, fallbackSlug),
        message: typeof payload?.message === 'string' ? payload.message : undefined,
        progress: typeof payload?.progress === 'number' ? payload.progress : undefined,
        createdAt,
        updatedAt
      }

      const next = [summary, ...filtered]
      next.sort((a, b) => {
        const timestampA = a.updatedAt ? Date.parse(a.updatedAt) : a.createdAt ? Date.parse(a.createdAt) : 0
        const timestampB = b.updatedAt ? Date.parse(b.updatedAt) : b.createdAt ? Date.parse(b.createdAt) : 0
        return (Number.isNaN(timestampB) ? 0 : timestampB) - (Number.isNaN(timestampA) ? 0 : timestampA)
      })

      return next
    })

    if (FINAL_STATUSES.has(status)) {
      unregisterManualTaskId(taskId)
    }

    if (status === 'completed' && resultPayload && resultPayload.filename) {
      setParsedManga(prev => {
        const alreadyExists = prev.some(item => item.filename === resultPayload.filename)
        if (alreadyExists) {
          return prev
        }

        return [
          ...prev,
          {
            filename: resultPayload.filename,
            title: resultPayload.title ?? resultPayload.filename,
            author: resultPayload.author ?? 'Неизвестно',
            chaptersCount: resultPayload.chaptersCount ?? resultPayload.chapters ?? 0,
            size: resultPayload.size ?? '—',
            createdAt: updatedAt ?? new Date().toISOString(),
            branches: resultPayload.branches
          }
        ]
      })
    }
  }, [unregisterManualTaskId])

  const hydrateTask = useCallback(async (taskId: string, fallbackSlug?: string) => {
    try {
      const response = await fetch(`/api/parser/status/${taskId}`)
      if (!response.ok) {
        if (response.status === 404 && typeof window !== 'undefined') {
          window.localStorage.removeItem('currentParsingTask')
        }
        return null
      }

      const payload = await response.json()
      applyTaskPayload(taskId, payload, fallbackSlug)
      return payload
    } catch (error) {
      console.error('Ошибка получения статуса задачи:', error)
      return null
    }
  }, [applyTaskPayload])

  const handleTaskSwitch = useCallback(async (taskId: string) => {
    if (!taskId || currentTask?.taskId === taskId) {
      return
    }

    const summary = taskSummaries.find(task => task.taskId === taskId)

    setCurrentTask({
      taskId,
      slug: summary?.slug ?? 'Неизвестно',
      status: 'pending',
      progress: 0,
      stage: 'Загрузка статуса...',
      startTime: new Date(),
      logs: []
    })

    await hydrateTask(taskId, summary?.slug)
  }, [currentTask?.taskId, hydrateTask, taskSummaries])

  const refreshTaskSummaries = useCallback(async (): Promise<TaskSummary[]> => {
    try {
      const response = await fetch('/api/parser/tasks')
      if (!response.ok) {
        console.error('Ошибка получения списка задач:', response.statusText)
        return []
      }

      const payload = await response.json()
      const summaries: TaskSummary[] = []

      if (Array.isArray(payload)) {
        for (const item of payload) {
          const rawId = item?.task_id ?? item?.taskId
          if (!rawId) {
            continue
          }

          const summary: TaskSummary = {
            taskId: String(rawId),
            status: normalizeTaskStatus(item?.status, 'pending'),
            slug: selectSlug(item?.slug, item?.current_slug),
            message: typeof item?.message === 'string' ? item.message : undefined,
            progress: typeof item?.progress === 'number' ? item.progress : undefined,
            createdAt: typeof item?.created_at === 'string' ? item.created_at : undefined,
            updatedAt: typeof item?.updated_at === 'string' ? item.updated_at : undefined
          }

          summaries.push(summary)
        }

        summaries.sort((a, b) => {
          const timestampA = a.updatedAt ? Date.parse(a.updatedAt) : a.createdAt ? Date.parse(a.createdAt) : 0
          const timestampB = b.updatedAt ? Date.parse(b.updatedAt) : b.createdAt ? Date.parse(b.createdAt) : 0
          return (Number.isNaN(timestampB) ? 0 : timestampB) - (Number.isNaN(timestampA) ? 0 : timestampA)
        })
      }

      // Показываем весь список задач, чтобы администраторы видели прогресс независимо от устройства
      setTaskSummaries(summaries)
      return summaries
    } catch (error) {
      console.error('Ошибка получения списка задач:', error)
      return []
    }
  }, [])

  // Восстанавливаем активную задачу после перезагрузки страницы
  useEffect(() => {
    const bootstrap = async () => {
      if (!manualIdsInitialized) {
        return
      }
      if (typeof window === 'undefined') {
        return
      }

      let storedTaskId: string | undefined
      let storedSlug: string | undefined

      const stored = window.localStorage.getItem('currentParsingTask')
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as { taskId?: string; slug?: string }
          storedTaskId = parsed?.taskId ?? undefined
          storedSlug = parsed?.slug ?? undefined
        } catch (error) {
          console.error('Не удалось прочитать сохраненную задачу из localStorage:', error)
          window.localStorage.removeItem('currentParsingTask')
        }
      }

      const summaries = await refreshTaskSummaries()

      if (storedTaskId && !summaries.some(summary => summary.taskId === storedTaskId)) {
        window.localStorage.removeItem('currentParsingTask')
        storedTaskId = undefined
        storedSlug = undefined
      }

      let targetTaskId = storedTaskId
      let targetSlug = storedSlug

      if (!targetTaskId) {
        const activeTask = summaries.find(summary => summary.status === 'running' || summary.status === 'pending')
        if (activeTask) {
          targetTaskId = activeTask.taskId
          targetSlug = activeTask.slug
        } else if (summaries.length > 0) {
          targetTaskId = summaries[0].taskId
          targetSlug = summaries[0].slug
        }
      }

      if (!targetTaskId) {
        return
      }

      setCurrentTask(prev => prev ?? {
        taskId: targetTaskId!,
        slug: targetSlug ?? 'Неизвестно',
        status: 'pending',
        progress: 0,
        stage: 'Восстановление статуса...',
        startTime: new Date()
      })

      await hydrateTask(targetTaskId, targetSlug)
    }

    bootstrap()
  }, [hydrateTask, manualIdsInitialized, refreshTaskSummaries])

  // Периодически обновляем статус активной задачи
  useEffect(() => {
    if (!currentTask?.taskId) {
      return
    }

    const isActive = currentTask.status === 'pending' || currentTask.status === 'running'
    let isCancelled = false

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/parser/status/${currentTask.taskId}`)

        if (!response.ok) {
          if (response.status === 404) {
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem('currentParsingTask')
            }
            setCurrentTask(null)
          } else {
            const errorPayload = await response.json().catch(() => ({}))
            toast.error(errorPayload.error || 'Ошибка получения статуса задачи')
          }
          return
        }

        const data = await response.json()
        if (isCancelled) {
          return
        }

        applyTaskPayload(currentTask.taskId, data, currentTask.slug)
      } catch (error) {
        console.error('Ошибка получения статуса:', error)
      }
    }

    fetchStatus()

    if (!isActive) {
      return () => {
        isCancelled = true
      }
    }

    const interval = window.setInterval(fetchStatus, 2000)

    return () => {
      isCancelled = true
      clearInterval(interval)
    }
  }, [applyTaskPayload, currentTask?.slug, currentTask?.status, currentTask?.taskId])

  useEffect(() => {
    const interval = window.setInterval(() => {
      refreshTaskSummaries()
    }, 15000)

    return () => {
      clearInterval(interval)
    }
  }, [refreshTaskSummaries])

  // Сохраняем активную задачу в localStorage, чтобы пережить перезагрузку
  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!currentTask?.taskId) {
      window.localStorage.removeItem('currentParsingTask')
      return
    }

    const status = currentTask.status?.toLowerCase?.()
    if (status === 'pending' || status === 'running') {
      window.localStorage.setItem('currentParsingTask', JSON.stringify({
        taskId: currentTask.taskId,
        slug: currentTask.slug
      }))
    } else {
      window.localStorage.removeItem('currentParsingTask')
      if (currentTask.taskId) {
        unregisterManualTaskId(currentTask.taskId)
      }
    }
  }, [currentTask?.slug, currentTask?.status, currentTask?.taskId, unregisterManualTaskId])

  const startParsing = async () => {
    if (!slug.trim()) {
      toast.error('Введите slug манги')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/parser/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ slug: slug.trim() })
      })

      const data = await response.json()

      if (response.ok) {
        const newTask: ParsingTask = {
          taskId: data.taskId,
          slug: slug.trim(),
          status: 'pending',
          progress: 0,
          stage: 'Инициализация...',
          startTime: new Date(),
          metrics: undefined,
          logs: []
        }

        setCurrentTask(newTask)
        registerManualTaskId(newTask.taskId)
        setTaskSummaries(prev => {
          const summary: TaskSummary = {
            taskId: newTask.taskId,
            status: 'pending',
            slug: newTask.slug,
            message: newTask.stage,
            progress: 0,
            createdAt: newTask.startTime.toISOString(),
            updatedAt: newTask.startTime.toISOString()
          }

          const filtered = prev.filter(item => item.taskId !== newTask.taskId)
          return [summary, ...filtered]
        })
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('currentParsingTask', JSON.stringify({
            taskId: newTask.taskId,
            slug: newTask.slug
          }))
        }
        setSlug('')
        toast.success('Парсинг запущен')
      } else {
        toast.error(data.error || 'Ошибка запуска парсинга')
      }
    } catch (error) {
      toast.error('Ошибка соединения �� сервером')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetry = async () => {
    if (currentTask) {
      const retryTaskId = currentTask.taskId
      setIsLoading(true)

      try {
        const response = await fetch(`/api/parser/retry/${currentTask.taskId}`, {
          method: 'POST'
        })

        const data = await response.json()

        if (response.ok) {
          setCurrentTask(prev => prev ? {
            ...prev,
            status: 'pending',
            progress: 0,
            stage: 'Инициализация...',
            error: undefined,
            result: undefined,
            metrics: undefined,
            logs: [],
            endTime: undefined,
            startTime: new Date()
          } : null)
          registerManualTaskId(retryTaskId)
          setTaskSummaries(prev => {
            const now = new Date().toISOString()
            return prev.map(item => item.taskId === retryTaskId
              ? {
                  ...item,
                  status: 'pending',
                  message: 'Инициализация...',
                  progress: 0,
                  updatedAt: now
                }
              : item)
          })
          toast.success('Задача успешно перезапущена')
        } else {
          toast.error(data.error || 'Ошибка перезапуска задачи')
        }
      } catch (error) {
        toast.error('О��ибка соединения с сер��ером')
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleOpenResult = (manga: ParsedManga) => {
    window.open(`/manga/${manga.filename}`, '_blank')
  }

  const activeMetrics: ParsingMetrics | undefined = currentTask?.metrics ?? (currentTask?.result?.metrics as ParsingMetrics | undefined)

  return (
    <div className="space-y-6">
      {/* Форма запуска парсинга */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Парсер манги
          </CardTitle>
          <CardDescription>
            Запуск полного парсинга манги с автоматическим скачиванием изображений
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">Slug манги</Label>
            <Input
              id="slug"
              placeholder="Например: chainsaw-man"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => e.key === 'Enter' && startParsing()}
            />
          </div>

          <Button
            onClick={startParsing}
            disabled={isLoading || !slug.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Запуск...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Запустить парсинг
              </>
            )}
          </Button>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Парсинг больши�� манг может занять значительное время.
              Прогресс б��дет отображаться в реальном времени.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Текущая за��ача парсинга */}
      {currentTask && (
        <Card>
          <CardHeader>
            <CardTitle>Текуща�� задача</CardTitle>
            <CardDescription>
              Статус и прогресс задачи парсинга
            </CardDescription>
            {taskSummaries.length > 1 && (
              <div className="space-y-1">
                <Label htmlFor="task-selector" className="text-xs text-muted-foreground">
                  Выберите задачу
                </Label>
                <select
                  id="task-selector"
                  value={currentTask.taskId}
                  onChange={(event) => handleTaskSwitch(event.target.value)}
                  className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm text-white"
                >
                  {taskSummaries.map(summary => (
                    <option key={summary.taskId} value={summary.taskId}>
                      {summary.slug ?? summary.taskId} · {summary.status}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {currentTask.status === 'running' ? (
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                ) : currentTask.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : currentTask.status === 'failed' ? (
                  <XCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Clock className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <h4 className="font-medium text-white">{currentTask.slug}</h4>
                  <p className="text-sm text-muted-foreground">
                    ID: {currentTask.taskId}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:justify-end">
                <Badge className={
                  currentTask.status === 'completed' ? 'bg-green-500' :
                  currentTask.status === 'failed' ? 'bg-red-500' :
                  currentTask.status === 'running' ? 'bg-blue-500' :
                  'bg-yellow-500'
                }>
                  {currentTask.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {Math.floor((currentTask.progress / 1000) % 60)}м {Math.floor((currentTask.progress / 1000 / 60) % 60)}с
                </span>
              </div>
            </div>

            {/* Прогресс парсинга */}
            {currentTask.status === 'running' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{currentTask.stage}</span>
                  <span className="text-white">
                    {currentTask.progress > 0
                      ? `${Math.floor(currentTask.progress / 1000)} сек`
                      : 'Подготовка...'
                    }
                  </span>
                </div>

                <Progress
                  value={currentTask.progress}
                  className="h-2"
                />
              </div>
            )}

            {/* Результат парсинга */}
            {currentTask.status === 'completed' && currentTask.result && (
              <div className="space-y-2">
                <h5 className="text-lg font-semibold text-white">Результат парсинга</h5>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="bg-muted p-4 rounded-lg">
                    <h6 className="font-medium">Название</h6>
                    <p className="text-sm text-muted-foreground">{currentTask.result.title}</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <h6 className="font-medium">Автор</h6>
                    <p className="text-sm text-muted-foreground">{currentTask.result.author}</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <h6 className="font-medium">Главы</h6>
                    <p className="text-sm text-muted-foreground">{currentTask.result.chaptersCount}</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <h6 className="font-medium">Размер</h6>
                    <p className="text-sm text-muted-foreground">{currentTask.result.size}</p>
                  </div>
                  <div className="col-span-2">
                    <Button
                      onClick={() => handleOpenResult(currentTask.result)}
                      className="w-full"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Открыть в новой вкладке
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Ошибка парсинга */}
            {currentTask.status === 'failed' && currentTask.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{currentTask.error}</AlertDescription>
              </Alert>
            )}

            {/* Кнопка повторного запуска задачи */}
            {(currentTask.status === 'failed' || currentTask.status === 'completed') && (
              <Button
                onClick={handleRetry}
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {currentTask.status === 'failed' ? 'Повторить' : 'Запустить заново'}
              </Button>
            )}

            {currentTask.logs && currentTask.logs.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-semibold text-white">Логи задачи</h5>
                <div className="max-h-64 overflow-auto rounded-lg border border-border bg-black/40 p-3">
                  <div className="space-y-1 text-xs font-mono">
                    {currentTask.logs.slice(-120).map((log, index) => (
                      <div key={`${log.timestamp}-${index}`} className="flex gap-2">
                        <span className="text-muted-foreground shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="shrink-0 text-blue-300">[{log.level}]</span>
                        <span className="text-white break-words">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Блок с метриками */}
      {activeMetrics?.aggregate && (
        <Card>
          <CardHeader>
            <CardTitle>Статистика парсинга</CardTitle>
            <CardDescription>
              Усредненные и суммарные показатели по текущей задаче
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Глав обработано</p>
                <p className="text-lg font-semibold text-white">{activeMetrics.aggregate.chapters}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Всего изображений</p>
                <p className="text-lg font-semibold text-white">{activeMetrics.aggregate.total_images}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Среднее время на главу</p>
                <p className="text-lg font-semibold text-white">
                  {activeMetrics.aggregate.avg_duration_seconds != null
                    ? `${activeMetrics.aggregate.avg_duration_seconds.toFixed(2)} с`
                    : '—'}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Скорость обработки</p>
                <p className="text-lg font-semibold text-white">
                  {activeMetrics.aggregate.images_per_second != null
                    ? `${activeMetrics.aggregate.images_per_second.toFixed(2)} img/s`
                    : '—'}
                </p>
              </div>
            </div>

            {activeMetrics.command?.duration_seconds != null && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Время запуска</p>
                  <p className="text-xs text-white">
                    {activeMetrics.command?.started_at
                      ? new Date(activeMetrics.command.started_at).toLocaleString()
                      : '—'}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Время завершения</p>
                  <p className="text-xs text-white">
                    {activeMetrics.command?.completed_at
                      ? new Date(activeMetrics.command.completed_at).toLocaleString()
                      : '—'}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Длительность</p>
                  <p className="text-lg font-semibold text-white">
                    {activeMetrics.command?.duration_seconds != null
                      ? `${activeMetrics.command.duration_seconds.toFixed(1)} с`
                      : '—'}
                  </p>
                </div>
              </div>
            )}

            {activeMetrics.chapters && activeMetrics.chapters.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-semibold text-white">Подробно по главам</h5>
                <div className="max-h-64 overflow-auto rounded-lg border border-border divide-y divide-border">
                  {activeMetrics.chapters.map((chapter, index) => (
                    <div key={`${chapter.chapter_id ?? index}-${chapter.started_at ?? index}`} className="grid grid-cols-1 gap-3 px-4 py-3 text-sm md:grid-cols-[1fr_auto_auto]">
                      <div>
                        <p className="text-white font-medium">{chapter.chapter_id ?? `Глава ${index + 1}`}</p>
                        <p className="text-xs text-muted-foreground">
                          {chapter.started_at ? new Date(chapter.started_at).toLocaleTimeString() : '—'}
                          {' '}
                          →
                          {' '}
                          {chapter.completed_at ? new Date(chapter.completed_at).toLocaleTimeString() : '—'}
                        </p>
                      </div>
                      <div className="text-right text-muted-foreground">
                        <p>{chapter.images ?? '—'} изображений</p>
                        <p className="text-xs">ожидалось {chapter.expected_images ?? '—'}</p>
                      </div>
                      <div className="text-right text-white font-semibold">
                        <p>{chapter.duration_seconds != null ? `${chapter.duration_seconds.toFixed(2)} с` : '—'}</p>
                        <p className="text-xs text-muted-foreground">
                          {chapter.images_per_second != null ? `${chapter.images_per_second.toFixed(2)} img/s` : '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* История парсинга */}
      <Card>
        <CardHeader>
          <CardTitle>История парсинга</CardTitle>
          <CardDescription>
            Завершенные задачи парсинга
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {parsedManga.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              История парсинга пуста
            </p>
          ) : (
            <div className="space-y-3">
              {parsedManga.map((manga) => (
                <div key={manga.filename} className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <div>
                        <h4 className="font-medium text-white">{manga.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {manga.author} - {manga.chaptersCount} глав
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">
                        {new Date(manga.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {manga.branches?.map(branch => (
                      <Badge key={branch} className="bg-muted text-muted-foreground">
                        {branch}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      onClick={() => handleOpenResult(manga)}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Открыть
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time progress компонент */}
      {currentTask && (currentTask.status === 'pending' || currentTask.status === 'running') && (
        <RealTimeProgress
          taskId={currentTask.taskId}
          title={`Парсинг: ${currentTask.slug}`}
          initialProgress={{
            task_id: currentTask.taskId,
            status: currentTask.status,
            progress: currentTask.progress,
            message: currentTask.stage,
            updated_at: (currentTask.endTime ?? new Date()).toISOString(),
            result: currentTask.result,
            metrics: currentTask.metrics
          }}
          initialLogs={currentTask.logs}
          onProgressUpdate={(data) => {
            const normalizedForStorage = normalizeTaskStatus(data.status, currentTask?.status ?? 'pending')
            setCurrentTask(prev => {
              if (!prev) return prev

              const normalizedStatus = normalizeTaskStatus(data.status, prev.status)
              const nextStatus = normalizedStatus
              const isFinished = nextStatus === 'completed' || nextStatus === 'failed'

              return {
                ...prev,
                status: nextStatus,
                progress: typeof data.progress === 'number' ? data.progress : prev.progress,
                stage: typeof data.message === 'string' ? data.message : prev.stage,
                result: data.result ?? prev.result,
                metrics: data.metrics ?? prev.metrics,
                endTime: isFinished ? new Date() : prev.endTime
              }
            })

            if (typeof window !== 'undefined') {
              if (normalizedForStorage === 'completed' || normalizedForStorage === 'failed') {
                window.localStorage.removeItem('currentParsingTask')
                if (currentTask?.taskId) {
                  unregisterManualTaskId(currentTask.taskId)
                }
              }
            }
          }}
          onComplete={(result) => {
            setCurrentTask(prev => prev ? {
              ...prev,
              status: 'completed',
              result,
              metrics: (result && typeof result === 'object' ? result.metrics : undefined) ?? prev.metrics,
              endTime: new Date()
            } : null)
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem('currentParsingTask')
            }
            if (currentTask?.taskId) {
              unregisterManualTaskId(currentTask.taskId)
            }
            toast.success('Парсинг завершен успешно!')
            // Обновляем список спаршенной манги
            setParsedManga(prev => {
              if (!result || typeof result !== 'object') {
                return prev
              }

              const filename = (result as any).filename
              if (typeof filename !== 'string' || filename.length === 0) {
                return prev
              }

              if (prev.some(item => item.filename === filename)) {
                return prev
              }

              return [
                ...prev,
                {
                  filename,
                  title: (result as any).title ?? filename,
                  author: (result as any).author ?? 'Неизвестно',
                  chaptersCount: (result as any).chaptersCount ?? (result as any).chapters ?? 0,
                  size: (result as any).size ?? '—',
                  createdAt: new Date().toISOString(),
                  branches: (result as any).branches
                }
              ]
            })
          }}
          onError={(error) => {
            setCurrentTask(prev => prev ? {
              ...prev,
              status: 'failed',
              error,
              endTime: new Date()
            } : null)
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem('currentParsingTask')
            }
            if (currentTask?.taskId) {
              unregisterManualTaskId(currentTask.taskId)
            }
            toast.error('Ошибка парсинга: ' + error)
          }}
          onLogMessage={(log: LogMessage) => {
            setCurrentTask(prev => {
              if (!prev) return prev
              const merged = mergeLogArrays(prev.logs ?? [], [log])
              return { ...prev, logs: merged }
            })
          }}
        />
      )}
    </div>
  )
}
