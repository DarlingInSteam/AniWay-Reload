import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Download, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface ParseTask {
  taskId: string
  slug: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: {
    current: number
    total: number
    stage: string
    currentChapter?: string
    downloadedImages?: number
    totalImages?: number
  }
  error?: string
  startTime: Date
  endTime?: Date
}

export function MangaParser() {
  const [slug, setSlug] = useState('')
  const [tasks, setTasks] = useState<ParseTask[]>([])
  const [isStarting, setIsStarting] = useState(false)

  // Обновляем статусы задач каждые 2 секунды
  useEffect(() => {
    const interval = setInterval(async () => {
      const activeTasks = tasks.filter(task =>
        task.status === 'pending' || task.status === 'running'
      )

      if (activeTasks.length > 0) {
        for (const task of activeTasks) {
          try {
            const response = await fetch(`/api/parser/status/${task.taskId}`)
            const data = await response.json()

            setTasks(prev => prev.map(t =>
              t.taskId === task.taskId
                ? {
                    ...t,
                    status: data.status,
                    progress: data.progress || t.progress,
                    error: data.error,
                    endTime: data.status === 'completed' || data.status === 'failed'
                      ? new Date() : t.endTime
                  }
                : t
            ))
          } catch (error) {
            console.error('Ошибка получения статуса:', error)
          }
        }
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [tasks])

  const startParsing = async () => {
    if (!slug.trim()) {
      toast.error('Введите slug манги')
      return
    }

    setIsStarting(true)

    try {
      const response = await fetch('/api/parser/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ slug: slug.trim() })
      })

      const data = await response.json()

      if (response.ok) {
        const newTask: ParseTask = {
          taskId: data.taskId,
          slug: slug.trim(),
          status: 'pending',
          progress: {
            current: 0,
            total: 0,
            stage: 'Инициализация...'
          },
          startTime: new Date()
        }

        setTasks(prev => [newTask, ...prev])
        setSlug('')
        toast.success('Парсинг запущен')
      } else {
        toast.error(data.error || 'Ошибка запуска парсинга')
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
    } finally {
      setIsStarting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
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

  const getStatusColor = (status: string) => {
    switch (status) {
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

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date()
    const diff = Math.floor((endTime.getTime() - start.getTime()) / 1000)

    if (diff < 60) return `${diff}с`
    if (diff < 3600) return `${Math.floor(diff / 60)}м ${diff % 60}с`
    return `${Math.floor(diff / 3600)}ч ${Math.floor((diff % 3600) / 60)}м`
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
              disabled={isStarting}
              onKeyDown={(e) => e.key === 'Enter' && startParsing()}
            />
          </div>

          <Button
            onClick={startParsing}
            disabled={isStarting || !slug.trim()}
            className="w-full"
          >
            {isStarting ? (
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
              Парсинг больших манг может занять значительное время.
              Прогресс будет отображаться в реальном времени.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Список задач парсинга */}
      {tasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Активные задачи</CardTitle>
            <CardDescription>
              История и статус задач парсинга
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {tasks.map((task) => (
              <div key={task.taskId} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(task.status)}
                    <div>
                      <h4 className="font-medium text-white">{task.slug}</h4>
                      <p className="text-sm text-muted-foreground">
                        ID: {task.taskId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(task.startTime, task.endTime)}
                    </span>
                  </div>
                </div>

                {/* Детальный прогресс */}
                {task.status === 'running' && task.progress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{task.progress.stage}</span>
                      <span className="text-white">
                        {task.progress.total > 0
                          ? `${task.progress.current}/${task.progress.total}`
                          : 'Подготовка...'
                        }
                      </span>
                    </div>

                    <Progress
                      value={task.progress.total > 0
                        ? (task.progress.current / task.progress.total) * 100
                        : 0
                      }
                      className="h-2"
                    />

                    {task.progress.currentChapter && (
                      <p className="text-xs text-muted-foreground">
                        Текущая глава: {task.progress.currentChapter}
                      </p>
                    )}

                    {task.progress.totalImages && task.progress.downloadedImages !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        <div className="flex justify-between mb-1">
                          <span>Изображения:</span>
                          <span>{task.progress.downloadedImages}/{task.progress.totalImages}</span>
                        </div>
                        <Progress
                          value={(task.progress.downloadedImages / task.progress.totalImages) * 100}
                          className="h-1"
                        />
                      </div>
                    )}
                  </div>
                )}

                {task.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{task.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
