import { useEffect } from 'react'
import { useForumCategories } from '@/hooks/useForum'
import { ForumCategoryList } from '@/components/forum/ForumCategoryList'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'

export function ForumPage() {
  useEffect(()=>{ document.title = 'Форум | AniWay'},[])
  const { data, isLoading, error } = useForumCategories()

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-manga-black via-manga-black/95 to-manga-black px-4 pb-24 pt-8 md:pt-10">
      <div className="mx-auto w-full max-w-7xl">
        <header className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl">Форум</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Обсуждения манги и платформы. Выберите категорию чтобы посмотреть темы.</p>
          </div>
          <Link to="/forum/create-thread" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-medium text-white shadow hover:bg-primary/90 transition">
            <Plus className="h-4 w-4" /> Новая тема
          </Link>
        </header>

        {isLoading && <div className="text-sm text-muted-foreground">Загрузка категорий...</div>}
        {error && <div className="text-sm text-red-400">Ошибка загрузки категорий</div>}
        {data && <ForumCategoryList categories={data} />}
      </div>
    </div>
  )
}

