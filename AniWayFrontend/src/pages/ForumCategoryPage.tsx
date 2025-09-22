import { useParams, Link } from 'react-router-dom'
import { useForumCategory, useForumThreads } from '@/hooks/useForum'
import { ForumThreadList } from '@/components/forum/ForumThreadList'
import { Plus, ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'
import { useThreadAuthors } from '@/hooks/useThreadAuthors'

export function ForumCategoryPage() {
  const { categoryId } = useParams()
  const id = categoryId ? parseInt(categoryId) : undefined
  const { data: category } = useForumCategory(id)
  const { data: threadsData, isLoading, error } = useForumThreads({ categoryId: id, page: 0, size: 30 })
  const authorUsers = useThreadAuthors(threadsData?.content)

  useEffect(()=>{ if(category) document.title = `${category.name} | Форум`},[category])

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-manga-black px-4 pb-24 pt-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <Link to="/forum" className="hover:text-white transition-colors">Форум</Link>
          <span>/</span>
          <span className="text-white">{category?.name || '...'}</span>
        </div>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">{category?.name || '...'}</h2>
            {category?.description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{category.description}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/forum" className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-white hover:bg-white/5 transition">
              <ArrowLeft className="h-3 w-3" /> Назад
            </Link>
            <Link to={`/forum/category/${id}/create-thread`} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary/90">
              <Plus className="h-3 w-3" /> Новая тема
            </Link>
          </div>
        </div>
        {isLoading && <div className="text-sm text-muted-foreground">Загрузка тем...</div>}
        {error && <div className="text-sm text-red-400">Ошибка загрузки тем</div>}
  {threadsData && <ForumThreadList threads={threadsData.content} users={authorUsers} />}
      </div>
    </div>
  )
}
