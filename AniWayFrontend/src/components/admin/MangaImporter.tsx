import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Upload, CheckCircle, XCircle, Clock, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

interface ParsedManga {
  filename: string
  title: string
  author: string
  chaptersCount: number
  size: string
  createdAt: string
  branches?: string[]
}

interface ImportTask {
  taskId: string
  filename: string
  branchId?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: {
    current: number
    total: number
    stage: string
    currentChapter?: string
    processedImages?: number
    totalImages?: number
  }
  error?: string
  startTime: Date
  endTime?: Date
}

export function MangaImporter() {
  const [parsedManga, setParsedManga] = useState<ParsedManga[]>([])
  const [importTasks, setImportTasks] = useState<ImportTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedBranches, setSelectedBranches] = useState<Record<string, string>>({})

  // Загружаем список спарсенной манги
  const loadParsedManga = async () => {
    try {
      // Используем правильный маршрут через Gateway Service -> MangaService -> MelonService
      const response = await fetch('/api/parser/list')
      if (response.ok) {
        const data = await response.json()
        setParsedManga(data)
      } else {
        console.error('Ошибка загрузки:', response.status, response.statusText)
        toast.error('Ошибка загрузки списка манги')
      }
    } catch (error) {
      console.error('Ошибка загрузки списка:', error)
      toast.error('Ошибка загрузки списка манги')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadParsedManga()
  }, [])

  // Обновляем статусы задач импорта
  useEffect(() => {
    const interval = setInterval(async () => {
      const activeTasks = importTasks.filter(task =>
        task.status === 'pending' || task.status === 'running'
      )

      if (activeTasks.length > 0) {
        for (const task of activeTasks) {
          try {
            const response = await fetch(`/api/parser/import/status/${task.taskId}`)
            const data = await response.json()

            setImportTasks(prev => prev.map(t =>
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
            console.error('Ошибка получения статуса импорта:', error)
          }
        }
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [importTasks])

  const startImport = async (filename: string) => {
    const branchId = selectedBranches[filename]

    try {
      const url = `/api/parser/import/${filename}${branchId ? `?branchId=${branchId}` : ''}`
      const response = await fetch(url, { method: 'POST' })
      const data = await response.json()

      if (response.ok) {
        const newTask: ImportTask = {
          taskId: data.taskId,
          filename,
          branchId,
          status: 'pending',
          progress: {
            current: 0,
            total: 0,
            stage: 'Подготовка импорта...'
          },
          startTime: new Date()
        }

        setImportTasks(prev => [newTask, ...prev])
        toast.success('Импорт запущен')
      } else {
        toast.error(data.error || 'Ошибка запуска импорта')
      }
    } catch (error) {
      toast.error('Ошибка соединения с сервером')
    }
  }

  const deleteManga = async (filename: string) => {
    if (!confirm(`Удалить м��нгу "${filename}"?`)) return

    try {
      const response = await fetch(`/api/parser/delete/${filename}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setParsedManga(prev => prev.filter(manga => manga.filename !== filename))
        toast.success('Манга удалена')
      } else {
        const data = await response.json()
        toast.error(data.error || 'Ошибка удаления')
      }
    } catch (error) {
      toast.error('Ошибка соединения с сер��ером')
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

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date()
    const diff = Math.floor((endTime.getTime() - start.getTime()) / 1000)

    if (diff < 60) return `${diff}с`
    if (diff < 3600) return `${Math.floor(diff / 60)}м ${diff % 60}с`
    return `${Math.floor(diff / 3600)}ч ${Math.floor((diff % 3600) / 60)}м`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Заголовок и ��бновление */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">Импорт манги</h3>
          <p className="text-sm text-muted-foreground">
            Импорт спарсенной манги в систему AniWay
          </p>
        </div>
        <Button onClick={loadParsedManga} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Обновить
        </Button>
      </div>

      {/* Список спарсенной манги */}
      <Card>
        <CardHeader>
          <CardTitle>Готовая к импорту манга</CardTitle>
          <CardDescription>
            Выберите мангу для импорта в систему. При наличии веток выберите нужную.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {parsedManga.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Нет готовой к импорту манги</p>
              <p className="text-sm">Сначала выполните парсинг манги</p>
            </div>
          ) : (
            <div className="space-y-4">
              {parsedManga.map((manga) => (
                <div key={manga.filename} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{manga.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {manga.author} • {manga.chaptersCount} глав • {manga.size}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {manga.filename} • {new Date(manga.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => deleteManga(manga.filename)}
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Выбор ветки */}
                  {manga.branches && manga.branches.length > 1 && (
                    <div className="mb-3">
                      <Select
                        value={selectedBranches[manga.filename] || ''}
                        onValueChange={(value) =>
                          setSelectedBranches(prev => ({
                            ...prev,
                            [manga.filename]: value
                          }))
                        }
                      >
                        <SelectTrigger className="w-full max-w-xs">
                          <SelectValue placeholder="Выберите ветку перевода" />
                        </SelectTrigger>
                        <SelectContent>
                          {manga.branches.map((branch) => (
                            <SelectItem key={branch} value={branch}>
                              {branch}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button
                    onClick={() => startImport(manga.filename)}
                    className="w-full"
                    disabled={importTasks.some(task =>
                      task.filename === manga.filename &&
                      (task.status === 'pending' || task.status === 'running')
                    )}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Импортировать в систему
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Активные задачи импорта */}
      {importTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Задачи импорта</CardTitle>
            <CardDescription>
              Статус �� прогресс импорта манги в систему
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {importTasks.map((task) => (
              <div key={task.taskId} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(task.status)}
                    <div>
                      <h4 className="font-medium text-white">{task.filename}</h4>
                      {task.branchId && (
                        <p className="text-sm text-muted-foreground">
                          Ветка: {task.branchId}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        ID: {task.taskId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={task.status === 'completed' ? 'bg-green-500' :
                                   task.status === 'failed' ? 'bg-red-500' :
                                   task.status === 'running' ? 'bg-blue-500' : 'bg-yellow-500'}>
                      {task.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDuration(task.startTime, task.endTime)}
                    </span>
                  </div>
                </div>

                {/* Детальный прогресс импорта */}
                {task.status === 'running' && task.progress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{task.progress.stage}</span>
                      <span className="text-white">
                        {task.progress.total > 0
                          ? `${task.progress.current}/${task.progress.total}`
                          : 'Обработка...'
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
                        Импорт главы: {task.progress.currentChapter}
                      </p>
                    )}

                    {task.progress.totalImages && task.progress.processedImages !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        <div className="flex justify-between mb-1">
                          <span>Обработано изображений:</span>
                          <span>{task.progress.processedImages}/{task.progress.totalImages}</span>
                        </div>
                        <Progress
                          value={(task.progress.processedImages / task.progress.totalImages) * 100}
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
