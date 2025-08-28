import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { BookOpen, Edit, Trash2, Search, RefreshCw, Plus, Eye, Calendar, User, Tag } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface MangaItem {
  id: number
  title: string
  author: string
  genre: string
  status: string
  description: string
  releaseDate: string
  coverImageUrl: string
  chapterCount: number
  createdAt: string
  updatedAt: string
}

interface EditMangaForm {
  title: string
  author: string
  genre: string
  status: string
  description: string
  releaseDate: string
}

const MANGA_STATUSES = [
  { value: 'ONGOING', label: 'Выходит' },
  { value: 'COMPLETED', label: 'Завершена' },
  { value: 'HIATUS', label: 'На паузе' },
  { value: 'CANCELLED', label: 'Отменена' }
]

export function MangaManager() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'CANCELLED'>('all')
  const [editingManga, setEditingManga] = useState<MangaItem | null>(null)
  const [editForm, setEditForm] = useState<EditMangaForm>({
    title: '',
    author: '',
    genre: '',
    status: 'ONGOING',
    description: '',
    releaseDate: ''
  })
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const queryClient = useQueryClient()

  // Загрузка списка манги
  const { data: mangaList = [], isLoading, refetch } = useQuery({
    queryKey: ['manga-list', searchQuery, statusFilter],
    queryFn: async () => {
      if (searchQuery.trim()) {
        return apiClient.searchManga({
          title: searchQuery,
          status: statusFilter !== 'all' ? statusFilter : undefined
        })
      }
      const allManga = await apiClient.getAllManga()
      if (statusFilter !== 'all') {
        return allManga.filter(manga => manga.status === statusFilter)
      }
      return allManga
    },
    staleTime: 30000
  })

  // Мутация для обновления манги
  const updateMangaMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: EditMangaForm }) => {
      return apiClient.updateManga(id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manga-list'] })
      setIsEditDialogOpen(false)
      setEditingManga(null)
      toast.success('Манга успешно обновлена')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  // Мутация для удаления манги
  const deleteMangaMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiClient.deleteManga(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manga-list'] })
      toast.success('Манга успешно удалена')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const openEditDialog = (manga: MangaItem) => {
    setEditingManga(manga)
    setEditForm({
      title: manga.title,
      author: manga.author,
      genre: manga.genre,
      status: manga.status,
      description: manga.description,
      releaseDate: manga.releaseDate.split('T')[0] // Форматируем дату для input[type=date]
    })
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = () => {
    if (!editingManga) return

    updateMangaMutation.mutate({
      id: editingManga.id,
      data: editForm
    })
  }

  const handleDeleteManga = (id: number) => {
    deleteMangaMutation.mutate(id)
  }

  const getStatusBadge = (status: string) => {
    const statusInfo = MANGA_STATUSES.find(s => s.value === status)
    const colors = {
      ONGOING: 'bg-green-500',
      COMPLETED: 'bg-blue-500',
      HIATUS: 'bg-yellow-500',
      CANCELLED: 'bg-red-500'
    }

    return (
      <Badge className={colors[status as keyof typeof colors] || 'bg-gray-500'}>
        {statusInfo?.label || status}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Фильтры и поиск */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Управление мангой
          </CardTitle>
          <CardDescription>
            Редактирование и удаление манги в системе
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Поиск</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Название манги..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Статус</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите статус" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {MANGA_STATUSES.map(status => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={() => refetch()} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Обновить
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список манги */}
      <Card>
        <CardHeader>
          <CardTitle>
            Манга в системе ({mangaList.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : mangaList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Манга не найдена</p>
              <p className="text-sm">Попробуйте изменить параметры поиска</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mangaList.map((manga) => (
                <div key={manga.id} className="border border-border rounded-lg overflow-hidden">
                  <div className="aspect-[3/4] relative">
                    <img
                      src={manga.coverImageUrl}
                      alt={manga.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = '/placeholder-manga.jpg'
                      }}
                    />
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(manga.status)}
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-medium text-white line-clamp-2" title={manga.title}>
                        {manga.title}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <User className="h-3 w-3" />
                        <span>{manga.author}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Tag className="h-3 w-3" />
                        <span className="line-clamp-1">{manga.genre.split(',')[0]}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(manga.releaseDate).getFullYear()}</span>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <span>Глав: {manga.chapterCount}</span>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/manga/${manga.id}`, '_blank')}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Просмотр
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(manga)}
                        className="flex-1"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Изменить
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-red-500 hover:bg-red-500/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить мангу?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Это действие нельзя отменить. Будут удалены все главы и изображения манги "{manga.title}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteManga(manga.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Диалог редактирования */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать мангу</DialogTitle>
            <DialogDescription>
              Изменение информации о манге "{editingManga?.title}"
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Название</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-author">Автор</Label>
                <Input
                  id="edit-author"
                  value={editForm.author}
                  onChange={(e) => setEditForm(prev => ({ ...prev, author: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Статус</Label>
                <Select value={editForm.status} onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MANGA_STATUSES.map(status => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-genre">Жанры</Label>
              <Input
                id="edit-genre"
                placeholder="Разделите жанры запятыми"
                value={editForm.genre}
                onChange={(e) => setEditForm(prev => ({ ...prev, genre: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-release-date">Дата выхода</Label>
              <Input
                id="edit-release-date"
                type="date"
                value={editForm.releaseDate}
                onChange={(e) => setEditForm(prev => ({ ...prev, releaseDate: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Описание</Label>
              <Textarea
                id="edit-description"
                rows={4}
                value={editForm.description}
                onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMangaMutation.isPending}>
              {updateMangaMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
