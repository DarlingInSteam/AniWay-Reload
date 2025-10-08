import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Download, RefreshCw, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface AutoParseTask {
  task_id: string
  status: string
  progress: number
  message: string
  total_slugs: number
  processed_slugs: number
  skipped_slugs: string[]
  imported_slugs: string[]
  failed_slugs: string[]
  start_time: string
  end_time?: string
  logs?: string[]  // Логи в реальном времени
}

interface AutoUpdateTask {
  task_id: string
  status: string
  progress: number
  message: string
  total_mangas: number
  processed_mangas: number
  updated_mangas: string[]
  failed_mangas: string[]
  new_chapters_count: number
  start_time: string
  end_time?: string
  logs?: string[]  // Логи в реальном времени
}

const AUTO_PARSE_STORAGE_KEY = 'autoParseTaskState'
const AUTO_UPDATE_STORAGE_KEY = 'autoUpdateTaskState'
const AUTO_TASK_POLL_INTERVAL = 2000
const FINAL_AUTO_STATUSES = new Set(['completed', 'failed', 'cancelled'])

const isTaskActive = (status?: string | null): boolean => {
  if (!status) {
    return false
  }

  const normalized = status.toLowerCase()
  return normalized === 'pending' || normalized === 'running'
}

const normalizeAutoParseTask = (payload: Partial<AutoParseTask> | null | undefined): AutoParseTask => {
  const base: AutoParseTask = {
    task_id: String(payload?.task_id ?? ''),
    status: String(payload?.status ?? 'pending'),
    progress: typeof payload?.progress === 'number' ? payload.progress : 0,
    message: typeof payload?.message === 'string' ? payload.message : '',
    total_slugs: typeof payload?.total_slugs === 'number' ? payload.total_slugs : 0,
    processed_slugs: typeof payload?.processed_slugs === 'number' ? payload.processed_slugs : 0,
    skipped_slugs: Array.isArray(payload?.skipped_slugs) ? payload!.skipped_slugs : [],
    imported_slugs: Array.isArray(payload?.imported_slugs) ? payload!.imported_slugs : [],
    failed_slugs: Array.isArray(payload?.failed_slugs) ? payload!.failed_slugs : [],
    start_time: typeof payload?.start_time === 'string' ? payload.start_time : new Date().toISOString(),
    end_time: typeof payload?.end_time === 'string' ? payload.end_time : undefined,
    logs: Array.isArray(payload?.logs) ? payload!.logs : []
  }

  return base
}

const normalizeAutoUpdateTask = (payload: Partial<AutoUpdateTask> | null | undefined): AutoUpdateTask => {
  const base: AutoUpdateTask = {
    task_id: String(payload?.task_id ?? ''),
    status: String(payload?.status ?? 'pending'),
    progress: typeof payload?.progress === 'number' ? payload.progress : 0,
    message: typeof payload?.message === 'string' ? payload.message : '',
    total_mangas: typeof payload?.total_mangas === 'number' ? payload.total_mangas : 0,
    processed_mangas: typeof payload?.processed_mangas === 'number' ? payload.processed_mangas : 0,
    updated_mangas: Array.isArray(payload?.updated_mangas) ? payload!.updated_mangas : [],
    failed_mangas: Array.isArray(payload?.failed_mangas) ? payload!.failed_mangas : [],
    new_chapters_count: typeof payload?.new_chapters_count === 'number' ? payload.new_chapters_count : 0,
    start_time: typeof payload?.start_time === 'string' ? payload.start_time : new Date().toISOString(),
    end_time: typeof payload?.end_time === 'string' ? payload.end_time : undefined,
    logs: Array.isArray(payload?.logs) ? payload!.logs : []
  }

  return base
}

// Компонент для отображения логов в реальном времени
function LogViewer({ logs }: { logs?: string[] }) {
  const logContainerRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
    }
  }, [logs, autoScroll])

  const handleScroll = () => {
    if (logContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current
      // Если пользователь прокрутил вверх, отключаем автоскролл
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 10
      setAutoScroll(isAtBottom)
    }
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-gray-950 rounded-lg p-4 font-mono text-sm text-gray-400 border border-gray-800">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Ожидание логов...</span>
        </div>
      </div>
    )
  }

  const getLogColor = (log: string) => {
    if (log.includes('[ERROR]')) return 'text-red-400'
    if (log.includes('[WARN]') || log.includes('[WARNING]')) return 'text-yellow-400'
    if (log.includes('[INFO]')) return 'text-green-400'
    if (log.includes('[DEBUG]')) return 'text-blue-400'
    return 'text-gray-300'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-white">Логи выполнения</Label>
        <div className="flex items-center gap-2">
          <Badge variant={autoScroll ? "default" : "secondary"} className="text-xs">
            {autoScroll ? '🔄 Автоскролл' : '⏸️ Пауза'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {logs.length} строк
          </span>
        </div>
      </div>
      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        className="bg-gray-950 rounded-lg p-4 font-mono text-sm max-h-96 overflow-y-auto border border-gray-800 shadow-inner"
        style={{
          scrollBehavior: autoScroll ? 'smooth' : 'auto',
        }}
      >
        {logs.map((log, index) => (
          <div
            key={index}
            className={`${getLogColor(log)} leading-relaxed hover:bg-gray-900 px-2 py-1 rounded transition-colors`}
          >
            {log}
          </div>
        ))}
      </div>
    </div>
  )
}

export function MangaManagement() {
  const [catalogPage, setCatalogPage] = useState<number>(1)
  const [parseLimit, setParseLimit] = useState<number | null>(null)
  const [autoParseTask, setAutoParseTask] = useState<AutoParseTask | null>(null)
  const [autoUpdateTask, setAutoUpdateTask] = useState<AutoUpdateTask | null>(null)
  const [isAutoParsing, setIsAutoParsing] = useState(false)
  const [isAutoUpdating, setIsAutoUpdating] = useState(false)

  const autoParseIntervalRef = useRef<number | null>(null)
  const autoUpdateIntervalRef = useRef<number | null>(null)
  const autoParseTaskRef = useRef<AutoParseTask | null>(null)
  const autoUpdateTaskRef = useRef<AutoUpdateTask | null>(null)
  const autoParsePrevStatusRef = useRef<string | null>(null)
  const autoUpdatePrevStatusRef = useRef<string | null>(null)

  const persistAutoParseTask = useCallback((task: AutoParseTask | null) => {
    if (typeof window === 'undefined') {
      return
    }

    if (!task || !task.task_id) {
      window.localStorage.removeItem(AUTO_PARSE_STORAGE_KEY)
      return
    }

    try {
      window.localStorage.setItem(AUTO_PARSE_STORAGE_KEY, JSON.stringify(task))
    } catch (error) {
      console.error('Не удалось сохранить состояние автопарсинга:', error)
    }
  }, [])

  const persistAutoUpdateTask = useCallback((task: AutoUpdateTask | null) => {
    if (typeof window === 'undefined') {
      return
    }

    if (!task || !task.task_id) {
      window.localStorage.removeItem(AUTO_UPDATE_STORAGE_KEY)
      return
    }

    try {
      window.localStorage.setItem(AUTO_UPDATE_STORAGE_KEY, JSON.stringify(task))
    } catch (error) {
      console.error('Не удалось сохранить состояние автообновления:', error)
    }
  }, [])

  useEffect(() => {
    autoParseTaskRef.current = autoParseTask
    if (autoParseTask) {
      persistAutoParseTask(autoParseTask)
    } else {
      persistAutoParseTask(null)
    }
  }, [autoParseTask, persistAutoParseTask])

  useEffect(() => {
    autoUpdateTaskRef.current = autoUpdateTask
    if (autoUpdateTask) {
      persistAutoUpdateTask(autoUpdateTask)
    } else {
      persistAutoUpdateTask(null)
    }
  }, [autoUpdateTask, persistAutoUpdateTask])

  const startAutoParsePolling = useCallback((taskId: string) => {
    if (!taskId) {
      return
    }

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/parser/auto-parse/status/${taskId}`)
        const data = await response.json()

        if (response.ok) {
          const normalized = normalizeAutoParseTask({ ...(autoParseTaskRef.current ?? undefined), ...data, task_id: taskId })
          setAutoParseTask(normalized)
          const running = isTaskActive(normalized.status)
          setIsAutoParsing(running)

          if (!running && autoParseIntervalRef.current) {
            window.clearInterval(autoParseIntervalRef.current)
            autoParseIntervalRef.current = null
          }
        } else {
          console.error('Ошибка получения статуса автопарсинга:', data?.error ?? response.statusText)
        }
      } catch (error) {
        console.error('Ошибка получения статуса автопарсинга:', error)
      }
    }

    if (autoParseIntervalRef.current) {
      window.clearInterval(autoParseIntervalRef.current)
    }

    fetchStatus()
    autoParseIntervalRef.current = window.setInterval(fetchStatus, AUTO_TASK_POLL_INTERVAL)
  }, [])

  const startAutoUpdatePolling = useCallback((taskId: string) => {
    if (!taskId) {
      return
    }

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/parser/auto-update/status/${taskId}`)
        const data = await response.json()

        if (response.ok) {
          const normalized = normalizeAutoUpdateTask({ ...(autoUpdateTaskRef.current ?? undefined), ...data, task_id: taskId })
          setAutoUpdateTask(normalized)
          const running = isTaskActive(normalized.status)
          setIsAutoUpdating(running)

          if (!running && autoUpdateIntervalRef.current) {
            window.clearInterval(autoUpdateIntervalRef.current)
            autoUpdateIntervalRef.current = null
          }
        } else {
          console.error('Ошибка получения статуса автообновления:', data?.error ?? response.statusText)
        }
      } catch (error) {
        console.error('Ошибка получения статуса автообновления:', error)
      }
    }

    if (autoUpdateIntervalRef.current) {
      window.clearInterval(autoUpdateIntervalRef.current)
    }

    fetchStatus()
    autoUpdateIntervalRef.current = window.setInterval(fetchStatus, AUTO_TASK_POLL_INTERVAL)
  }, [])

  useEffect(() => () => {
    if (autoParseIntervalRef.current) {
      window.clearInterval(autoParseIntervalRef.current)
      autoParseIntervalRef.current = null
    }
    if (autoUpdateIntervalRef.current) {
      window.clearInterval(autoUpdateIntervalRef.current)
      autoUpdateIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    const currentStatus = autoParseTask?.status ?? null
    const previousStatus = autoParsePrevStatusRef.current

    if (currentStatus && currentStatus !== previousStatus && FINAL_AUTO_STATUSES.has(currentStatus.toLowerCase())) {
      if (currentStatus.toLowerCase() === 'completed') {
        const imported = autoParseTask?.imported_slugs?.length ?? 0
        const skipped = autoParseTask?.skipped_slugs?.length ?? 0
        toast.success(`Автопарсинг завершен! Импортировано: ${imported}, пропущено: ${skipped}`)
      } else if (currentStatus.toLowerCase() === 'cancelled') {
        toast.warning('Автопарсинг отменен')
      } else if (currentStatus.toLowerCase() === 'failed') {
        toast.error('Автопарсинг завершился с ошибкой')
      }
    }

    autoParsePrevStatusRef.current = currentStatus
  }, [autoParseTask])

  useEffect(() => {
    const currentStatus = autoUpdateTask?.status ?? null
    const previousStatus = autoUpdatePrevStatusRef.current

    if (currentStatus && currentStatus !== previousStatus && FINAL_AUTO_STATUSES.has(currentStatus.toLowerCase())) {
      if (currentStatus.toLowerCase() === 'completed') {
        const updated = autoUpdateTask?.updated_mangas?.length ?? 0
        const newChapters = autoUpdateTask?.new_chapters_count ?? 0
        toast.success(`Автообновление завершено! Обновлено манг: ${updated}, добавлено глав: ${newChapters}`)
      } else if (currentStatus.toLowerCase() === 'failed') {
        toast.error('Автообновление завершилось с ошибкой')
      }
    }

    autoUpdatePrevStatusRef.current = currentStatus
  }, [autoUpdateTask])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    try {
      const storedAutoParse = window.localStorage.getItem(AUTO_PARSE_STORAGE_KEY)
      if (storedAutoParse) {
        const parsed = normalizeAutoParseTask(JSON.parse(storedAutoParse))
        if (parsed.task_id) {
          setAutoParseTask(parsed)
          autoParseTaskRef.current = parsed
          if (isTaskActive(parsed.status)) {
            setIsAutoParsing(true)
            startAutoParsePolling(parsed.task_id)
          }
        }
      }

      const storedAutoUpdate = window.localStorage.getItem(AUTO_UPDATE_STORAGE_KEY)
      if (storedAutoUpdate) {
        const parsed = normalizeAutoUpdateTask(JSON.parse(storedAutoUpdate))
        if (parsed.task_id) {
          setAutoUpdateTask(parsed)
          autoUpdateTaskRef.current = parsed
          if (isTaskActive(parsed.status)) {
            setIsAutoUpdating(true)
            startAutoUpdatePolling(parsed.task_id)
          }
        }
      }
    } catch (error) {
      console.error('Не удалось восстановить состояние автоматизации из localStorage:', error)
      window.localStorage.removeItem(AUTO_PARSE_STORAGE_KEY)
      window.localStorage.removeItem(AUTO_UPDATE_STORAGE_KEY)
    }
  }, [startAutoParsePolling, startAutoUpdatePolling])

  // Автопарсинг манги из каталога
  const startAutoParsing = async () => {
    if (catalogPage <= 0) {
      toast.error('Номер страницы должен быть больше 0')
      return
    }

    // Валидация limit
    if (parseLimit !== null && parseLimit <= 0) {
      toast.error('Ограничение должно быть больше 0')
      return
    }

    setIsAutoParsing(true)
    
    try {
      const response = await fetch('/api/parser/auto-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          page: catalogPage,
          limit: parseLimit 
        })
      })

      const data = await response.json()

      if (response.ok) {
        const taskId = String(data.task_id ?? data.taskId ?? '')
        const normalized = normalizeAutoParseTask({
          ...data,
          task_id: taskId,
          start_time: data.start_time ?? new Date().toISOString()
        })
        setAutoParseTask(normalized)
        autoParseTaskRef.current = normalized
        setIsAutoParsing(true)
        toast.success('Автопарсинг запущен')
        startAutoParsePolling(taskId)
      } else {
        toast.error(data.error || 'Ошибка запуска автопарсинга')
        setIsAutoParsing(false)
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
      setIsAutoParsing(false)
    }
  }

  // Отмена автопарсинга
  const cancelAutoParsing = async () => {
    if (!autoParseTask?.task_id) {
      toast.error('Нет активной задачи для отмены')
      return
    }

    try {
      const response = await fetch(`/api/parser/auto-parse/cancel/${autoParseTask.task_id}`, {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok && data.cancelled) {
        toast.success('Автопарсинг отменяется...')
        // Статус обновится через polling
      } else {
        toast.error(data.message || 'Не удалось отменить задачу')
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
    }
  }

  // Автообновление манги
  const startAutoUpdate = async () => {
    setIsAutoUpdating(true)

    try {
      const response = await fetch('/api/parser/auto-update', {
        method: 'POST'
      })

      const data = await response.json()

      if (response.ok) {
        const taskId = String(data.task_id ?? data.taskId ?? '')
        const normalized = normalizeAutoUpdateTask({
          ...data,
          task_id: taskId,
          start_time: data.start_time ?? new Date().toISOString()
        })
        setAutoUpdateTask(normalized)
        autoUpdateTaskRef.current = normalized
        setIsAutoUpdating(true)
        toast.success('Автообновление запущено')
        startAutoUpdatePolling(taskId)
      } else {
        toast.error(data.error || 'Ошибка запуска автообновления')
        setIsAutoUpdating(false)
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
      setIsAutoUpdating(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white">Управление мангой</h3>
        <p className="text-sm text-muted-foreground">
          Автоматический парсинг и обновление манги
        </p>
      </div>

      {/* Автопарсинг */}
      <Card>
        <CardHeader>
          <CardTitle>Автопарсинг манги</CardTitle>
          <CardDescription>
            Автоматический парсинг, билдинг и импорт манг из каталога MangaLib. Пропускает уже существующие манги.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="catalogPage">
              Номер страницы каталога MangaLib
            </Label>
            <Input
              id="catalogPage"
              type="number"
              min="1"
              placeholder="Введите номер страницы (например, 1, 2, 3...)"
              value={catalogPage}
              onChange={(e) => setCatalogPage(parseInt(e.target.value, 10) || 1)}
              disabled={isAutoParsing}
              className="bg-background text-white"
            />
            <p className="text-xs text-muted-foreground">
              Каждая страница содержит до 60 манг из каталога MangaLib
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parseLimit">
              Ограничение количества манг (опционально)
            </Label>
            <Input
              id="parseLimit"
              type="number"
              min="1"
              placeholder="Введите количество (например, 20, 100) или оставьте пустым для парсинга всех"
              value={parseLimit ?? ''}
              onChange={(e) => {
                const value = e.target.value
                setParseLimit(value === '' ? null : parseInt(value, 10))
              }}
              disabled={isAutoParsing}
              className="bg-background text-white"
            />
            <p className="text-xs text-muted-foreground">
              Если указано, будет обработано только первые N манг со страницы
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={startAutoParsing}
              disabled={isAutoParsing}
              className="flex-1"
            >
              {isAutoParsing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Парсинг выполняется...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {parseLimit 
                    ? `Запустить автопарсинг (страница ${catalogPage}, лимит: ${parseLimit})` 
                    : `Запустить автопарсинг (страница ${catalogPage})`
                  }
                </>
              )}
            </Button>
            
            {isAutoParsing && autoParseTask?.status === 'running' && (
              <Button
                onClick={cancelAutoParsing}
                variant="destructive"
                className="px-8"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Отменить
              </Button>
            )}
          </div>

          {/* Статус автопарсинга */}
          {autoParseTask && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(autoParseTask.status)}
                  <div>
                    <h4 className="font-medium text-white">Автопарсинг</h4>
                    <p className="text-sm text-muted-foreground">
                      {autoParseTask.message}
                    </p>
                  </div>
                </div>
                <Badge className={
                  autoParseTask.status === 'completed' ? 'bg-green-500' :
                  autoParseTask.status === 'failed' ? 'bg-red-500' :
                  autoParseTask.status === 'running' ? 'bg-blue-500' : 'bg-yellow-500'
                }>
                  {autoParseTask.status}
                </Badge>
              </div>

              <Progress value={autoParseTask.progress} className="h-2" />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Всего:</span>
                  <span className="ml-2 text-white">{autoParseTask.total_slugs || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Обработано:</span>
                  <span className="ml-2 text-white">{autoParseTask.processed_slugs || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Импортировано:</span>
                  <span className="ml-2 text-green-500">{autoParseTask.imported_slugs?.length || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Пропущено:</span>
                  <span className="ml-2 text-yellow-500">{autoParseTask.skipped_slugs?.length || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ошибок:</span>
                  <span className="ml-2 text-red-500">{autoParseTask.failed_slugs?.length || 0}</span>
                </div>
              </div>

              {(autoParseTask.failed_slugs?.length || 0) > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Ошибки при обработке: {autoParseTask.failed_slugs?.join(', ') || ''}
                  </AlertDescription>
                </Alert>
              )}

              {/* Логи в реальном времени */}
              <LogViewer logs={autoParseTask.logs} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Автообновление */}
      <Card>
        <CardHeader>
          <CardTitle>Автообновление манги</CardTitle>
          <CardDescription>
            Проверка и импорт новых глав для всех манг в системе
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Этот процесс проверит все манги в системе на наличие новых глав и автоматически импортирует их.
              Это может занять продолжительное время.
            </AlertDescription>
          </Alert>

          <Button
            onClick={startAutoUpdate}
            disabled={isAutoUpdating}
            className="w-full"
          >
            {isAutoUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Обновление выполняется...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Запустить автообновление
              </>
            )}
          </Button>

          {/* Статус автообновления */}
          {autoUpdateTask && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(autoUpdateTask.status)}
                  <div>
                    <h4 className="font-medium text-white">Автообновление</h4>
                    <p className="text-sm text-muted-foreground">
                      {autoUpdateTask.message}
                    </p>
                  </div>
                </div>
                <Badge className={
                  autoUpdateTask.status === 'completed' ? 'bg-green-500' :
                  autoUpdateTask.status === 'failed' ? 'bg-red-500' :
                  autoUpdateTask.status === 'running' ? 'bg-blue-500' : 'bg-yellow-500'
                }>
                  {autoUpdateTask.status}
                </Badge>
              </div>

              <Progress value={autoUpdateTask.progress} className="h-2" />

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Всего манг:</span>
                  <span className="ml-2 text-white">{autoUpdateTask.total_mangas}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Проверено:</span>
                  <span className="ml-2 text-white">{autoUpdateTask.processed_mangas}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Обновлено манг:</span>
                  <span className="ml-2 text-green-500">{autoUpdateTask.updated_mangas.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Добавлено глав:</span>
                  <span className="ml-2 text-blue-500">{autoUpdateTask.new_chapters_count}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Ошибок:</span>
                  <span className="ml-2 text-red-500">{autoUpdateTask.failed_mangas.length}</span>
                </div>
              </div>

              {autoUpdateTask.updated_mangas.length > 0 && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-white">Обновленные манги:</p>
                  <div className="text-xs text-muted-foreground max-h-32 overflow-y-auto">
                    {autoUpdateTask.updated_mangas.map((manga, i) => (
                      <div key={i}>• {manga}</div>
                    ))}
                  </div>
                </div>
              )}

              {autoUpdateTask.failed_mangas.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Ошибки при обновлении: {autoUpdateTask.failed_mangas.join(', ')}
                  </AlertDescription>
                </Alert>
              )}

              {/* Логи в реальном времени */}
              <LogViewer logs={autoUpdateTask.logs} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
