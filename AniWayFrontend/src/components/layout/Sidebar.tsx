import { Link, useLocation } from 'react-router-dom'
import { BookOpen, Search, TrendingUp, Star, Clock, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Популярное', href: '/catalog?sort=popular', icon: TrendingUp },
  { name: 'Новинки', href: '/catalog?sort=latest', icon: Clock },
  { name: 'Топ рейтинг', href: '/catalog?sort=rating', icon: Star },
  { name: 'Поиск', href: '/search', icon: Search },
]

const genres = [
  'Экшен',
  'Приключения',
  'Комедия',
  'Драма',
  'Фантастика',
  'Романтика',
  'Ужасы',
  'Сёнэн',
  'Сёдзё'
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:pt-16">
      <div className="flex-1 flex flex-col min-h-0 bg-card border-r">
        <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
          <nav className="mt-5 flex-1 px-2 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                    location.pathname === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Genres */}
          <div className="mt-8 px-2">
            <div className="flex items-center mb-3">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Жанры</h3>
            </div>
            <div className="space-y-1">
              {genres.map((genre) => (
                <Link
                  key={genre}
                  to={`/catalog?genre=${encodeURIComponent(genre)}`}
                  className="block px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
                >
                  {genre}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
