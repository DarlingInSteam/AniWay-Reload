import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, Bell, Bookmark, User, Menu, X, Settings } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { cn } from '@/lib/utils'
import { UserMenu } from '../auth/UserMenu'
import { useAuth } from '../../contexts/AuthContext'

export function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchType, setSearchType] = useState<'manga' | 'users'>('manga')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const searchRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated, isAdmin, isTranslator } = useAuth()

  // Автодополнение поиска манги
  const { data: mangaSuggestions, isError: mangaError } = useQuery({
    queryKey: ['search-manga-suggestions', searchQuery],
    queryFn: () => apiClient.searchManga({ query: searchQuery }),
    enabled: searchQuery.length >= 2 && searchType === 'manga',
    staleTime: 30000,
    retry: 1,
    retryDelay: 1000,
  })

  // Автодополнение поиска пользователей
  const { data: userSuggestions, isError: userError } = useQuery({
    queryKey: ['search-user-suggestions', searchQuery],
    queryFn: () => apiClient.searchUsers({ query: searchQuery, limit: 8 }),
    enabled: searchQuery.length >= 2 && searchType === 'users',
    staleTime: 30000,
    retry: 1,
    retryDelay: 1000,
  })

  const handleMangaSuggestionClick = (mangaId: number, title: string) => {
    navigate(`/manga/${mangaId}`)
    setShowSuggestions(false)
    setSearchQuery('')
  }

  const handleUserSuggestionClick = (userId: number, username: string) => {
    navigate(`/profile/${userId}`)
    setShowSuggestions(false)
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

  // Закрываем бургер-меню при клике вне его области
  useEffect(() => {
    const handleMenuClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false)
      }
    }

    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleMenuClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleMenuClickOutside)
    }
  }, [mobileMenuOpen])

  // Показываем автодополнение при вводе
  useEffect(() => {
    if (searchQuery.length >= 2) {
      if (searchType === 'manga' && mangaSuggestions?.length && !mangaError) {
        setShowSuggestions(true)
      } else if (searchType === 'users' && userSuggestions?.users.length && !userError) {
        setShowSuggestions(true)
      } else {
        setShowSuggestions(false)
      }
    } else {
      setShowSuggestions(false)
    }
  }, [searchQuery, mangaSuggestions, userSuggestions, mangaError, userError, searchType])

  return (
    <header className="sticky top-0 z-50 w-full bg-manga-black/95 backdrop-blur-md border-b border-border/20">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8 lg:relative">
        {/* Левый блок: логотип + навигация */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <Link to="/" className="flex items-center flex-shrink-0">
            <img src="/icon.png" alt="AniWay Logo" className="h-10 w-10 md:h-12 md:w-12" />
          </Link>

          {/* Навигация - только на десктопе */}
          <nav className="hidden lg:flex items-center space-x-4 lg:space-x-6 ml-4">
            <Link
              to="/catalog"
              className="text-sm font-medium text-muted-foreground hover:text-white transition-colors duration-200 whitespace-nowrap"
            >
              Каталог
            </Link>
            <Link
              to="#"
              className="text-sm font-medium text-muted-foreground hover:text-white transition-colors duration-200 whitespace-nowrap"
            >
              Топы
            </Link>
            <Link
              to="#"
              className="text-sm font-medium text-muted-foreground hover:text-white transition-colors duration-200 whitespace-nowrap"
            >
              Форум
            </Link>
          </nav>
        </div>

        {/* Центр: Поиск - разное поведение для мобильных и десктопа */}
        <div className="flex-1 max-w-md mx-4 lg:absolute lg:left-1/2 lg:top-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-xl lg:px-0">
          <div ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              <input
                type="search"
                placeholder="Поиск манги..."
                className="w-full h-10 md:h-12 pl-10 md:pl-12 pr-10 md:pr-12 rounded-full bg-card border border-border/30 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 text-sm md:text-base"
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
                  className="absolute right-3 md:right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-secondary transition-colors"
                >
                  <X className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground hover:text-white" />
                </button>
              )}

              {/* Autocomplete Suggestions - адаптивные */}
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
                        className="w-10 h-12 md:w-12 md:h-16 object-cover rounded-lg mr-3 flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = '/placeholder-manga.jpg'
                        }}
                      />
                      <div className="flex-1 text-left">
                        <h4 className="text-white font-medium line-clamp-1 text-sm md:text-base">{manga.title}</h4>
                        <p className="text-muted-foreground text-xs md:text-sm">
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

        {/* Правый блок: действия + бургер меню */}
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {/* Кнопки действий + UserMenu - адаптивные */}
          <div className="hidden md:flex items-center space-x-2">
            <UserMenu />
          </div>

          {/* Бургер меню - всегда показан */}
          <div className="relative" ref={menuRef}>
            <button
              className="p-2 rounded-full hover:bg-card transition-colors duration-200 flex items-center justify-center"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
              ) : (
                <Menu className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
              )}
            </button>
            {mobileMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border/30 rounded-xl shadow-lg z-50 flex flex-col">
                {/* Мобильная навигация - только на мобильных */}
                <div className="lg:hidden border-b border-border/30">
                  <Link
                    to="/catalog"
                    className="px-6 py-3 text-base text-white hover:bg-secondary transition-colors flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Каталог
                  </Link>
                  <Link
                    to="#"
                    className="px-6 py-3 text-base text-white hover:bg-secondary transition-colors flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Топы
                  </Link>
                  <Link
                    to="#"
                    className="px-6 py-3 text-base text-white hover:bg-secondary transition-colors flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Форум
                  </Link>

                  {/* Пользовательские ссылки */}
                  {isAuthenticated ? (
                    <>
                      <Link
                        to="/profile"
                        className="px-6 py-3 text-base text-white hover:bg-secondary transition-colors flex items-center gap-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        Профиль
                      </Link>
                      <Link
                        to="/library"
                        className="px-6 py-3 text-base text-white hover:bg-secondary transition-colors flex items-center gap-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Bookmark className="h-4 w-4" />
                        Библиотека
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className="px-6 py-3 text-base text-white hover:bg-secondary transition-colors flex items-center gap-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <User className="h-4 w-4" />
                        Вход
                      </Link>
                      <Link
                        to="/register"
                        className="px-6 py-3 text-base text-white hover:bg-secondary transition-colors flex items-center gap-2"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Регистрация
                      </Link>
                    </>
                  )}
                </div>
                
                {/* Админские ссылки */}
                {isAdmin && (
                  <Link
                    to="/admin/manga"
                    className="px-6 py-3 text-base text-white hover:bg-secondary transition-colors flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" /> Управление
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
