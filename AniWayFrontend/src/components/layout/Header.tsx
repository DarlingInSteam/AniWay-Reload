import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, Bell, Bookmark, User, Menu, X, Settings } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { cn } from '@/lib/utils'

export function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const searchRef = useRef<HTMLDivElement>(null)

  // Автодополнение поиска с обработкой ошибок
  const { data: suggestions, isError } = useQuery({
    queryKey: ['search-suggestions', searchQuery],
    queryFn: () => apiClient.searchManga({ title: searchQuery }),
    enabled: searchQuery.length >= 2,
    staleTime: 30000, // Кешируем на 30 секунд
    retry: 1, // Пробуем только 1 раз при ошибке
    retryDelay: 1000,
  })

  const handleSuggestionClick = (mangaId: number, title: string) => {
    // Переходим сразу на страницу манги
    navigate(`/manga/${mangaId}`)
    setShowSuggestions(false)
    // Очищаем поле поиска после перехода
    setSearchQuery('')
  }

  const clearSearch = () => {
    setSearchQuery('')
    setShowSuggestions(false)
  }

  // Закрываем автодополнение при клике вне области поиска
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Показываем автодополнение при вводе
  useEffect(() => {
    if (searchQuery.length >= 2 && suggestions?.length && !isError) {
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }, [searchQuery, suggestions, isError])

  return (
    <header className="sticky top-0 z-50 w-full bg-manga-black/95 backdrop-blur-md border-b border-border/20">
      <div className="container mx-auto flex h-16 items-center px-4 lg:px-8 relative">
        {/* Левый блок: логотип + навигация */}
        <div className="flex items-center flex-shrink-0 gap-4">
          <Link to="/" className="flex items-center">
            <img src="/icon.png" alt="AniWay Logo" className="h-12 w-12" />
          </Link>
          <nav className="flex items-center space-x-6">
            <Link
              to="/catalog"
              className="text-sm font-medium text-muted-foreground hover:text-white transition-colors duration-200"
            >
              Каталог
            </Link>
            <Link
              to="#"
              className="text-sm font-medium text-muted-foreground hover:text-white transition-colors duration-200"
            >
              Топы
            </Link>
            <Link
              to="#"
              className="text-sm font-medium text-muted-foreground hover:text-white transition-colors duration-200"
            >
              Форум
            </Link>
            {/* Бургер-меню всегда доступно */}
            <div className="relative">
              <button
                className="ml-2 p-2 rounded-full hover:bg-card transition-colors duration-200"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Menu className="h-6 w-6 text-muted-foreground" />
              </button>
              {mobileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border/30 rounded-xl shadow-lg z-50 flex flex-col">
                  <Link
                    to="/admin/manga"
                    className="px-6 py-3 text-base text-white hover:bg-secondary transition-colors flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" /> Управление
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Центр: Поиск */}
        <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-xl">
          <div ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="search"
                placeholder="Поиск манги..."
                className="w-full h-12 pl-12 pr-12 rounded-full bg-card border border-border/30 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchQuery.length >= 2 && suggestions?.length && !isError) {
                    setShowSuggestions(true)
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-white" />
                </button>
              )}

              {/* Autocomplete Suggestions */}
              {showSuggestions && suggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/30 rounded-xl shadow-2xl max-h-80 overflow-y-auto z-50">
                  {suggestions.slice(0, 8).map((manga) => (
                    <button
                      key={manga.id}
                      type="button"
                      onClick={() => handleSuggestionClick(manga.id, manga.title)}
                      className="w-full flex items-center p-3 hover:bg-secondary/50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      <img
                        src={manga.coverImageUrl}
                        alt={manga.title}
                        className="w-12 h-16 object-cover rounded-lg mr-3 flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/placeholder-manga.jpg'
                        }}
                      />
                      <div className="flex-1 text-left">
                        <h4 className="text-white font-medium line-clamp-1">{manga.title}</h4>
                        <p className="text-muted-foreground text-sm">
                          {manga.genre.split(',')[0]} • {new Date(manga.releaseDate).getFullYear()}
                        </p>
                      </div>
                    </button>
                  ))}

                  {/* Show message if no direct matches */}
                  {searchQuery.length >= 2 && suggestions.length === 0 && !isError && (
                    <div className="p-4 text-center">
                      <p className="text-muted-foreground text-sm">
                        По запросу "{searchQuery}" ничего не найдено
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Error state for suggestions */}
              {searchQuery.length >= 2 && isError && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/30 rounded-xl p-3 z-50">
                  <p className="text-muted-foreground text-sm text-center">
                    Поиск временно недоступен
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Правый блок: действия */}
        <div className="flex items-center space-x-4 flex-shrink-0 ml-auto">
          <button className="p-2 rounded-full hover:bg-secondary transition-colors duration-200">
            <Bell className="h-5 w-5 text-muted-foreground hover:text-white" />
          </button>
          <button className="p-2 rounded-full hover:bg-secondary transition-colors duration-200">
            <Bookmark className="h-5 w-5 text-muted-foreground hover:text-white" />
          </button>
          <button className="p-2 rounded-full hover:bg-secondary transition-colors duration-200">
            <User className="h-5 w-5 text-muted-foreground hover:text-white" />
          </button>
        </div>
      </div>
    </header>
  )
}
