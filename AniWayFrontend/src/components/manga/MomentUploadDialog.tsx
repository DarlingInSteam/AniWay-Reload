import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api'
import type { MomentCreateRequest, MomentImagePayload, MomentResponse } from '@/types/moments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface MomentUploadDialogProps {
  mangaId: number
  trigger?: React.ReactNode
  onCreated: (moment: MomentResponse) => void
}

interface UploadMetadata {
  mangaId: number
  chapterId?: number
  pageNumber?: number
}

export function MomentUploadDialog({ mangaId, trigger, onCreated }: MomentUploadDialogProps) {
  const { isAuthenticated } = useAuth()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [pageNumber, setPageNumber] = useState('')
  const [spoiler, setSpoiler] = useState(false)
  const [nsfw, setNsfw] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const fileLabel = useMemo(() => {
    if (!file) return 'Изображение не выбрано'
    const kb = file.size / 1024
    const mb = kb / 1024
    const size = mb >= 1 ? `${mb.toFixed(2)} МБ` : `${kb.toFixed(0)} КБ`
    return `${file.name} · ${size}`
  }, [file])

  const resetState = () => {
    setFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setCaption('')
    setChapterId('')
    setPageNumber('')
    setSpoiler(false)
    setNsfw(false)
    setError(null)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0]
    if (!selected) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      setFile(null)
      return
    }

    if (!selected.type.startsWith('image/')) {
      setError('Поддерживаются только изображения')
      return
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setFile(selected)
    setPreviewUrl(URL.createObjectURL(selected))
    setError(null)
  }

  const parseNumberField = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
  }

  const buildMetadata = (): UploadMetadata => {
    const metadata: UploadMetadata = { mangaId }
    const parsedChapter = parseNumberField(chapterId)
    const parsedPage = parseNumberField(pageNumber)
    if (parsedChapter !== undefined) {
      metadata.chapterId = parsedChapter
    }
    if (parsedPage !== undefined) {
      metadata.pageNumber = parsedPage
    }
    return metadata
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isAuthenticated) {
      setError('Войдите, чтобы делиться моментами')
      return
    }
    if (!file) {
      setError('Выберите изображение для загрузки')
      return
    }
    const trimmedCaption = caption.trim()
    if (!trimmedCaption) {
      setError('Добавьте подпись к моменту')
      return
    }
    if (trimmedCaption.length > 280) {
      setError('Подпись не может превышать 280 символов')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const imagePayload: MomentImagePayload = await apiClient.uploadMomentImage(file, buildMetadata())
      const payload: MomentCreateRequest = {
        mangaId,
        caption: trimmedCaption,
        spoiler,
        nsfw,
        image: imagePayload,
        chapterId: parseNumberField(chapterId) ?? null,
        pageNumber: parseNumberField(pageNumber) ?? null
      }
      const created = await apiClient.createMoment(payload)
      onCreated(created)
      toast.success('Момент опубликован')
      setOpen(false)
      resetState()
    } catch (err: any) {
      console.error('Failed to upload moment', err)
      const message = err?.message || 'Не удалось отправить момент'
      setError(message)
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      if (!isAuthenticated && next) {
        toast.info('Авторизуйтесь, чтобы делиться моментами')
        return
      }
      if (!next) {
        resetState()
      }
      setOpen(next)
    }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-primary text-black hover:bg-primary/90" size="sm">
            Поделиться моментом
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-black/90 text-white border-white/10 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Новый момент</DialogTitle>
          <DialogDescription className="text-white/60">
            Загрузите кадр, добавьте подпись и отметьте, если он содержит спойлер или NSFW-контент.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="moment-file">Изображение</Label>
            <Input
              id="moment-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isSubmitting}
            />
            <p className="text-sm text-white/50">{fileLabel}</p>
            {previewUrl && (
              <div className="mt-2 overflow-hidden rounded-2xl border border-white/10">
                <img src={previewUrl} alt="Предпросмотр момента" className="w-full object-cover" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="moment-caption">Подпись</Label>
            <Textarea
              id="moment-caption"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={280}
              placeholder="Расскажите, что происходит на кадре"
              disabled={isSubmitting}
              className="min-h-[100px] bg-black/60 border-white/10"
            />
            <div className="text-xs text-white/40 text-right">{caption.length}/280</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="moment-chapter">ID главы (опционально)</Label>
              <Input
                id="moment-chapter"
                value={chapterId}
                onChange={(event) => setChapterId(event.target.value)}
                placeholder="Например, 1024"
                disabled={isSubmitting}
                inputMode="numeric"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="moment-page">Номер страницы (опционально)</Label>
              <Input
                id="moment-page"
                value={pageNumber}
                onChange={(event) => setPageNumber(event.target.value)}
                placeholder="Например, 12"
                disabled={isSubmitting}
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <label className="inline-flex items-center gap-3 text-sm text-white/80">
              <Checkbox
                checked={spoiler}
                onCheckedChange={(checked) => setSpoiler(Boolean(checked))}
                disabled={isSubmitting}
              />
              Спойлер
            </label>
            <label className="inline-flex items-center gap-3 text-sm text-white/80">
              <Checkbox
                checked={nsfw}
                onCheckedChange={(checked) => setNsfw(Boolean(checked))}
                disabled={isSubmitting}
              />
              NSFW
            </label>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <DialogFooter className="flex items-center justify-between gap-4">
            <p className="text-xs text-white/40">
              Максимальный размер файла — 8 МБ. Поддерживаются форматы JPEG, PNG и WebP.
            </p>
            <Button type="submit" disabled={isSubmitting || !file} className="min-w-[140px]">
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Загружаем…
                </span>
              ) : (
                'Опубликовать'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
