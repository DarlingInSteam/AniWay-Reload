import { MessageSquare, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect } from 'react'

export function ForumPage() {
  useEffect(() => {
    document.title = 'Форум | AniWay'
  }, [])

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-manga-black via-manga-black/95 to-manga-black px-4 pb-16 pt-8 md:pt-10">
      <div className="mx-auto w-full max-w-7xl">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-4xl">
              Форум сообщества
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Обсуждайте главы, делитесь теориями, предлагайте улучшения платформы и задавайте вопросы. 
              Форум пока в разработке — скоро здесь появятся категории и темы.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/catalog"
              className="group inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-white shadow-sm backdrop-blur transition-all hover:border-primary/40 hover:bg-primary/10"
            >
              <span>Вернуться в каталог</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-white/[0.03] to-white/[0.02] p-8 shadow-xl">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-600/10 blur-3xl" />
          </div>
          <div className="relative z-10 flex flex-col items-center justify-center text-center">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary backdrop-blur">
              <MessageSquare className="h-11 w-11" />
            </div>
            <h2 className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-2xl font-semibold text-transparent md:text-3xl">
              Раздел готовится
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Мы уже разворачиваем инфраструктуру: категории, темы обсуждений, система постов, реакции и подписки. 
              Совсем скоро вы сможете общаться прямо здесь.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
              <span className="rounded-full bg-white/5 px-4 py-2 backdrop-blur">Категории</span>
              <span className="rounded-full bg-white/5 px-4 py-2 backdrop-blur">Темы</span>
              <span className="rounded-full bg-white/5 px-4 py-2 backdrop-blur">Ответы</span>
              <span className="rounded-full bg-white/5 px-4 py-2 backdrop-blur">Подписки</span>
              <span className="rounded-full bg-white/5 px-4 py-2 backdrop-blur">Реакции</span>
              <span className="rounded-full bg-white/5 px-4 py-2 backdrop-blur">Модерация</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
