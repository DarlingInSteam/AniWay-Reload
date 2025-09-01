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
}

export function MangaParser() {
  const [slug, setSlug] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentTask, setCurrentTask] = useState<ParsingTask | null>(null)
  const [parsedManga, setParsedManga] = useState<ParsedManga[]>([])

  // Обновляем статус текущей задачи парсинга
  useEffect(() => {
    const fetchStatus = async () => {
      if (currentTask && currentTask.taskId && (currentTask.status === 'pending' || currentTask.status === 'running')) {
        try {
          const response = await fetch(`/api/parser/status/${currentTask.taskId}`)
          const data = await response.json()

          if (response.ok) {
            setCurrentTask(prev => prev ? { ...prev, ...data } : null)
          } else {
            toast.error(data.error || 'Ошибка получения статуса задачи')
          }
        } catch (error) {
          console.error('Ошибка получения статуса:', error)
        }
      }
    }

    const interval = setInterval(fetchStatus, 2000)

    return () => clearInterval(interval)
  }, [currentTask?.taskId, currentTask?.status])

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
          startTime: new Date()
        }

        setCurrentTask(newTask)
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
          setCurrentTask(prev => prev ? { ...prev, status: 'pending', progress: 0, stage: 'Инициализация...' } : null)
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
          onComplete={(result) => {
            setCurrentTask(prev => prev ? { ...prev, status: 'completed', result, endTime: new Date() } : null)
            toast.success('Парсинг завершен успешно!')
            // Обновляем список спаршенной манги
            setParsedManga(prev => [...prev, result])
          }}
          onError={(error) => {
            setCurrentTask(prev => prev ? { ...prev, status: 'failed', error, endTime: new Date() } : null)
            toast.error('Ошибка парсинга: ' + error)
          }}
        />
      )}
    </div>
  )
}
