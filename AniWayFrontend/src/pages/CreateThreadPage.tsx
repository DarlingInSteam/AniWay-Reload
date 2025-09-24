import { useState, useEffect } from 'react'
import { MarkdownEditor } from '@/components/markdown/MarkdownEditor'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useCreateThread, useForumCategories } from '@/hooks/useForum'
import { ArrowLeft } from 'lucide-react'

export function CreateThreadPage() {
  const { categoryId } = useParams()
  const navigate = useNavigate()
  const cid = categoryId ? parseInt(categoryId) : undefined
  const { data: categories } = useForumCategories()
  const createThread = useCreateThread()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(cid)

  useEffect(()=>{ document.title = 'Новая тема | Форум'},[])

  const submit = () => {
    if (!title.trim() || !content.trim() || !selectedCategory) return
    createThread.mutate({ title: title.trim(), content: content.trim(), categoryId: selectedCategory }, {
      onSuccess: (thread) => {
        navigate(`/forum/thread/${thread.id}`)
      }
    })
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-manga-black px-4 pb-32 pt-6">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Link to="/forum" className="hover:text-white">Форум</Link>
          <span>/</span>
          <span className="text-white">Новая тема</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h1 className="mb-6 text-2xl font-bold text-white">Создать новую тему</h1>
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Категория</label>
              <select value={selectedCategory ?? ''} onChange={e=> setSelectedCategory(e.target.value ? parseInt(e.target.value): undefined)} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value="" disabled>Выберите категорию</option>
                {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Заголовок</label>
              <input value={title} onChange={e=> setTitle(e.target.value)} maxLength={180} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40" placeholder="Кратко опишите тему" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Содержимое</label>
              <MarkdownEditor value={content} onChange={setContent} placeholder="Поддерживается Markdown + спойлеры (||текст||)" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Link to={selectedCategory ? `/forum/category/${selectedCategory}` : '/forum'} className="rounded-lg border border-white/10 px-4 py-2 text-sm text-muted-foreground hover:text-white hover:bg-white/5">Отмена</Link>
              <button disabled={!title.trim() || !content.trim() || !selectedCategory || createThread.isPending} onClick={submit} className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-primary/90 transition">
                {createThread.isPending ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
