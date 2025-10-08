import { useState, useEffect } from 'react'
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
import type { ParsingMetrics } from '@/types'

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
}

export function MangaParser() {
  const [slug, setSlug] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentTask, setCurrentTask] = useState<ParsingTask | null>(null)
  const [parsedManga, setParsedManga] = useState<ParsedManga[]>([])

  // Восстанавливаем активную задачу после перезагрузки страницы
  useEffect(() => {
    const restoreTask = async () => {
      if (typeof window === 'undefined') return

      const stored = window.localStorage.getItem('currentParsingTask')
      if (!stored) return

      try {
        const parsed = JSON.parse(stored) as { taskId?: string; slug?: string }
        if (!parsed?.taskId) return

        // Показываем placeholder пока получаем фактический статус
        setCurrentTask(prev => prev ?? {
          taskId: parsed.taskId!,
          slug: parsed.slug ?? 'Неизвестно',
          status: 'pending',
          progress: 0,
          stage: 'Восстановление статуса...',
          startTime: new Date()
        })

        const response = await fetch(`/api/parser/status/${parsed.taskId}`)
        if (!response.ok) {
          window.localStorage.removeItem('currentParsingTask')
          return
        }

        const data = await response.json()
        setCurrentTask(prev => {
          if (!prev) {
            return null
          }

          const rawStatus = typeof data.status === 'string' ? data.status.toLowerCase() : undefined
          const allowedStatuses: ParsingTask['status'][] = ['pending', 'running', 'completed', 'failed']
          const nextStatus = rawStatus && allowedStatuses.includes(rawStatus as ParsingTask['status'])
            ? rawStatus as ParsingTask['status']
            : prev.status

          const isFinished = nextStatus === 'completed' || nextStatus === 'failed'

          return {
            ...prev,
            slug: prev.slug || (data.result && typeof data.result.filename === 'string' ? data.result.filename : prev.slug),
            status: nextStatus,
            progress: typeof data.progress === 'number' ? data.progress : prev.progress,
            stage: typeof data.message === 'string' ? data.message : prev.stage,
            error: data.error ?? prev.error,
            result: data.result ?? prev.result,
            metrics: data.metrics ?? prev.metrics,
            endTime: isFinished ? new Date() : prev.endTime
          }
        })
      } catch (error) {
        console.error('Ошибка восстановления задачи парсинга:', error)
        window.localStorage.removeItem('currentParsingTask')
      }
    }

    restoreTask()
  }, [])

  // Периодически обновляем статус активной задачи
  useEffect(() => {
    if (!currentTask?.taskId) {
      return
    }

    const normalizedStatus = currentTask.status?.toLowerCase?.()
    const isActive = normalizedStatus === 'pending' || normalizedStatus === 'running'
    if (!isActive) {
      return
    }

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
            const errorPayload = await response.json()
            toast.error(errorPayload.error || 'Ошибка получения статуса задачи')
          }
          return
        }

        const data = await response.json()
        if (isCancelled) {
          return
        }

        setCurrentTask(prev => {
          if (!prev) {
            return prev
          }

          const rawStatus = typeof data.status === 'string' ? data.status.toLowerCase() : undefined
          const allowedStatuses: ParsingTask['status'][] = ['pending', 'running', 'completed', 'failed']
          const nextStatus = rawStatus && allowedStatuses.includes(rawStatus as ParsingTask['status'])
            ? rawStatus as ParsingTask['status']
            : prev.status
          const isFinished = nextStatus === 'completed' || nextStatus === 'failed'

          return {
            ...prev,
            slug: prev.slug || (data.result && typeof data.result.filename === 'string' ? data.result.filename : prev.slug),
            status: nextStatus,
            progress: typeof data.progress === 'number' ? data.progress : prev.progress,
            stage: typeof data.message === 'string' ? data.message : prev.stage,
            error: data.error ?? prev.error,
            result: data.result ?? prev.result,
            metrics: data.metrics ?? prev.metrics,
            endTime: isFinished ? new Date() : prev.endTime
          }
        })
      } catch (error) {
        console.error('Ошибка получения статуса:', error)
      }
    }

    fetchStatus()
    const interval = window.setInterval(fetchStatus, 2000)

    return () => {
      isCancelled = true
      clearInterval(interval)
    }
  }, [currentTask?.taskId, currentTask?.status])

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
    }
  }, [currentTask?.taskId, currentTask?.status, currentTask?.slug])

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
          metrics: undefined
        }

        setCurrentTask(newTask)
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
            endTime: undefined,
            startTime: new Date()
          } : null)
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
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
              <div className="flex items-center gap-3">
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

                <div className="grid grid-cols-2 gap-4">
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
          </CardContent>
        </Card>
      )}

      {/* Блок с метриками */}
      {currentTask?.metrics?.aggregate && (
        <Card>
          <CardHeader>
            <CardTitle>Статистика парсинга</CardTitle>
            <CardDescription>
              Усредненные и суммарные показатели по текущей задаче
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Глав обработано</p>
                <p className="text-lg font-semibold text-white">{currentTask.metrics.aggregate.chapters}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Всего изображений</p>
                <p className="text-lg font-semibold text-white">{currentTask.metrics.aggregate.total_images}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Среднее время на главу</p>
                <p className="text-lg font-semibold text-white">
                  {currentTask.metrics.aggregate.avg_duration_seconds != null
                    ? `${currentTask.metrics.aggregate.avg_duration_seconds.toFixed(2)} с`
                    : '—'}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Скорость обработки</p>
                <p className="text-lg font-semibold text-white">
                  {currentTask.metrics.aggregate.images_per_second != null
                    ? `${currentTask.metrics.aggregate.images_per_second.toFixed(2)} img/s`
                    : '—'}
                </p>
              </div>
            </div>

            {currentTask.metrics.command?.duration_seconds != null && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Время запуска</p>
                  <p className="text-xs text-white">
                    {currentTask.metrics.command.started_at
                      ? new Date(currentTask.metrics.command.started_at).toLocaleString()
                      : '—'}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Время завершения</p>
                  <p className="text-xs text-white">
                    {currentTask.metrics.command.completed_at
                      ? new Date(currentTask.metrics.command.completed_at).toLocaleString()
                      : '—'}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">Длительность</p>
                  <p className="text-lg font-semibold text-white">
                    {currentTask.metrics.command.duration_seconds.toFixed(1)} с
                  </p>
                </div>
              </div>
            )}

            {currentTask.metrics.chapters && currentTask.metrics.chapters.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-semibold text-white">Подробно по главам</h5>
                <div className="max-h-64 overflow-auto rounded-lg border border-border divide-y divide-border">
                  {currentTask.metrics.chapters.map((chapter, index) => (
                    <div key={`${chapter.chapter_id ?? index}-${chapter.started_at ?? index}`} className="grid grid-cols-[1fr,auto,auto] gap-3 px-4 py-3 text-sm">
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
                  <div className="flex items-center justify-between">
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
          onProgressUpdate={(data) => {
            setCurrentTask(prev => {
              if (!prev) return prev

              const normalizedStatus = typeof data.status === 'string' ? data.status.toLowerCase() : prev.status
              const allowedStatuses: ParsingTask['status'][] = ['pending', 'running', 'completed', 'failed']
              const nextStatus = allowedStatuses.includes(normalizedStatus as ParsingTask['status'])
                ? normalizedStatus as ParsingTask['status']
                : prev.status
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
              const normalizedStatus = typeof data.status === 'string' ? data.status.toLowerCase() : undefined
              if (normalizedStatus === 'completed' || normalizedStatus === 'failed') {
                window.localStorage.removeItem('currentParsingTask')
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
            toast.success('Парсинг завершен успешно!')
            // Обновляем список спаршенной манги
            setParsedManga(prev => [...prev, result])
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
            toast.error('Ошибка парсинга: ' + error)
          }}
        />
      )}
    </div>
  )
}
