import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Search, Bell, Bookmark, User, Menu, X, Settings, MessageSquare, Globe2, MessageCircle } from 'lucide-react'
import { NotificationBell } from '@/notifications/NotificationBell'
import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { cn } from '@/lib/utils'
import { UserMenu } from '../auth/UserMenu'
import { useAuth } from '../../contexts/AuthContext'

export function Header() {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const searchRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { isAuthenticated, isAdmin, isTranslator } = useAuth()
  const { data: inboxSummary } = useQuery({
    queryKey: ['inbox-summary'],
    queryFn: () => apiClient.getInboxSummary(),
    enabled: isAuthenticated,
    staleTime: 15000,
    refetchInterval: 45000,
  })
  const channelUnread = inboxSummary?.channelUnread ?? 0
  const directUnread = inboxSummary?.directUnread ?? 0

  // Универсальный поиск манги
  // Debounce input to limit network calls
  useEffect(() => {
    const h = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250)
    return () => clearTimeout(h)
  }, [searchQuery])

  const { data: mangaSuggestions, isError: mangaError } = useQuery({
    queryKey: ['search-manga-suggestions', debouncedQuery],
    queryFn: () => apiClient.searchManga({ query: debouncedQuery }),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000,
    retry: 1,
    retryDelay: 1000,
  })

  // Универсальный поиск пользователей
  const { data: userSuggestions, isError: userError } = useQuery({
    queryKey: ['search-user-suggestions', debouncedQuery],
    queryFn: () => apiClient.searchUsers({ query: debouncedQuery, limit: 6 }),
    enabled: debouncedQuery.length >= 2,
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
    if (debouncedQuery.length >= 2) {
      if ((mangaSuggestions && mangaSuggestions.length > 0 && !mangaError) ||
          (userSuggestions && userSuggestions.users && userSuggestions.users.length > 0 && !userError)) {
        setShowSuggestions(true)
      } else {
        setShowSuggestions(false)
      }
    } else {
      setShowSuggestions(false)
    }
  }, [debouncedQuery, mangaSuggestions, userSuggestions, mangaError, userError])

  return (
    <header className="hidden md:block sticky top-0 z-40 w-full bg-manga-black/95 backdrop-blur-md border-b border-border/20">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-8 lg:relative">
        {/* Левый блок: логотип + навигация */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          <Link to="/" className="flex items-center flex-shrink-0">
            <img src="/icon.png" alt="AniWay Logo" className="h-10 w-10 md:h-12 md:w-12" />
          </Link>

          {/* Навигация - только на десктопе */}
          <nav className="hidden lg:flex items-center space-x-4 lg:space-x-6 ml-4">
            {[
              { label: 'Каталог', to: '/catalog' },
              { label: 'Топы', to: '/tops' },
              { label: 'Форум', to: '/forum' },
              { label: 'Чат', to: '/chat' },
              { label: 'API Docs', to: '/api-docs' }
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'text-sm font-medium transition-colors duration-200 whitespace-nowrap',
                  'text-muted-foreground hover:text-white',
                  (() => {
                    if (item.to === '/tops') return location.pathname.startsWith('/tops')
                    if (item.to === '/forum') return location.pathname.startsWith('/forum')
                    return location.pathname.startsWith(item.to)
                  })() && 'text-white'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Центр: Универсальный поиск */}
        <div className="flex-1 max-w-md mx-4 lg:absolute lg:left-1/2 lg:top-1/2 lg:transform lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-xl lg:px-0">
          <div ref={searchRef}>
            <div className="relative">
              <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              <input
                type="search"
                placeholder="Поиск манги и пользователей..."
                className="w-full h-10 md:h-12 pl-10 md:pl-12 pr-10 md:pr-12 rounded-full bg-card border border-border/30 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 text-sm md:text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (debouncedQuery.length >= 2) {
                    if ((mangaSuggestions && mangaSuggestions.length > 0 && !mangaError) ||
                        (userSuggestions && userSuggestions.users && userSuggestions.users.length > 0 && !userError)) {
                      setShowSuggestions(true)
                    }
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

              {/* Универсальные результаты поиска */}
              {showSuggestions && ((mangaSuggestions && mangaSuggestions.length > 0) || (userSuggestions && userSuggestions.users && userSuggestions.users.length > 0)) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border/30 rounded-xl shadow-2xl max-h-80 overflow-y-auto z-50">
                  
                  {/* Секция манги */}
                  {mangaSuggestions && mangaSuggestions.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-white/5 border-b border-white/10">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Манга</h3>
                      </div>
                      {mangaSuggestions.slice(0, 4).map((manga) => (
                        <button
                          key={manga.id}
                          type="button"
                          onClick={() => handleMangaSuggestionClick(manga.id, manga.title)}
                          className="w-full flex items-center p-3 hover:bg-secondary/50 transition-colors"
                        >
                          <img
                            src={manga.coverImageUrl || '/placeholder-manga.jpg'}
                            alt={manga.title}
                            className="w-10 h-12 md:w-12 md:h-16 object-cover rounded-lg mr-3 flex-shrink-0"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = '/placeholder-manga.jpg'
                            }}
                          />
                          <div className="flex-1 text-left min-w-0">
                            <h4 className="font-medium text-white truncate text-sm md:text-base">
                              {manga.title}
                            </h4>
                            <p className="text-xs md:text-sm text-muted-foreground truncate">
                              {manga.genre ? manga.genre.split(',')[0] : 'Без жанра'} • {manga.releaseDate ? new Date(manga.releaseDate).getFullYear() : '—'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Секция пользователей */}
                  {userSuggestions && userSuggestions.users && userSuggestions.users.length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-white/5 border-b border-white/10">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Пользователи</h3>
                      </div>
                      {userSuggestions.users.slice(0, 4).map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleUserSuggestionClick(user.id, user.username)}
                          className="w-full flex items-center p-3 hover:bg-secondary/50 transition-colors"
                        >
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mr-3 flex-shrink-0">
                            <User className="w-5 h-5 md:w-6 md:h-6 text-white" />
                          </div>
                          <div className="flex-1 text-left min-w-0">
                            <h4 className="font-medium text-white truncate text-sm md:text-base">
                              {user.username}
                            </h4>
                            <p className="text-xs md:text-sm text-muted-foreground truncate">
                              {user.role === 'ADMIN' && '👑 Администратор'}
                              {user.role === 'TRANSLATOR' && '📝 Переводчик'}
                              {user.role === 'USER' && '👤 Пользователь'}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Сообщение если ничего не найдено */}
                  {debouncedQuery.length >= 2 && 
                   (!mangaSuggestions || mangaSuggestions.length === 0) && 
                   (!userSuggestions || !userSuggestions.users || userSuggestions.users.length === 0) && 
                   !mangaError && !userError && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Ничего не найдено</p>
                      <p className="text-xs mt-1">Попробуйте изменить запрос</p>
                    </div>
                  )}

                  {/* Ошибка загрузки */}
                  {debouncedQuery.length >= 2 && (mangaError || userError) && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Ошибка при поиске</p>
                      <p className="text-xs mt-1">Попробуйте позже</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Правый блок: действия пользователя */}
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {isAuthenticated ? (
            <>
              {/* Иконки действий - скрываем на мобилке */}
              <div className="hidden md:flex items-center gap-1 lg:gap-2">
                <Link
                  to="/bookmarks"
                  className="p-2 lg:p-3 rounded-xl hover:bg-secondary/50 text-muted-foreground hover:text-white transition-colors duration-200"
                  title="Закладки"
                >
                  <Bookmark className="h-5 w-5" />
                </Link>

                <Link
                  to="/chat"
                  className="relative p-2 lg:p-3 rounded-xl hover:bg-secondary/50 text-muted-foreground hover:text-white transition-colors duration-200"
                  title="Глобальный чат"
                >
                  <Globe2 className="h-5 w-5" />
                  {channelUnread > 0 && (
                    <span className="absolute top-1 right-1 inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-black/60" />
                  )}
                </Link>

                <Link
                  to="/messages"
                  className="relative p-2 lg:p-3 rounded-xl hover:bg-secondary/50 text-muted-foreground hover:text-white transition-colors duration-200"
                  title="Личные сообщения"
                >
                  <MessageCircle className="h-5 w-5" />
                  {directUnread > 0 && (
                    <span className="absolute top-0.5 right-0 inline-flex min-w-[1.25rem] justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white ring-2 ring-black/60">
                      {directUnread > 9 ? '9+' : directUnread}
                    </span>
                  )}
                </Link>
                
                <NotificationBell />

                {/* Ссылка на управление доступна только для администраторов */}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="p-2 lg:p-3 rounded-xl hover:bg-secondary/50 text-muted-foreground hover:text-white transition-colors duration-200"
                    title="Управление"
                  >
                    <Settings className="h-5 w-5" />
                  </Link>
                )}
              </div>

              {/* Пользовательское меню */}
              <UserMenu />
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3 py-2 md:px-4 md:py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors duration-200"
              >
                Войти
              </Link>
              <Link
                to="/register"
                className="px-3 py-2 md:px-4 md:py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors duration-200"
              >
                Регистрация
              </Link>
            </div>
          )}

          {/* Бургер-меню для мобилки */}
          <div className="lg:hidden ml-2" ref={menuRef}>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl hover:bg-secondary/50 text-muted-foreground hover:text-white transition-colors duration-200"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Мобильное меню */}
            {mobileMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-card border border-border/30 rounded-xl shadow-2xl py-2 z-50">
                <Link
                  to="/catalog"
                  className="flex items-center px-4 py-3 text-sm text-muted-foreground hover:text-white hover:bg-secondary/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Каталог
                </Link>
                <Link
                  to="/tops"
                  className="flex items-center px-4 py-3 text-sm text-muted-foreground hover:text-white hover:bg-secondary/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Топы
                </Link>
                <Link
                  to="/forum"
                  className="flex items-center px-4 py-3 text-sm text-muted-foreground hover:text-white hover:bg-secondary/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <MessageSquare className="h-4 w-4 mr-3" />
                  Форум
                </Link>
                <Link
                  to="/chat"
                  className="flex items-center px-4 py-3 text-sm text-muted-foreground hover:text-white hover:bg-secondary/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Globe2 className="h-4 w-4 mr-3" />
                  Глобальный чат
                  {channelUnread > 0 && (
                    <span className="ml-auto inline-flex min-w-[1.5rem] justify-center rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                      {channelUnread}
                    </span>
                  )}
                </Link>
                <Link
                  to="/messages"
                  className="flex items-center px-4 py-3 text-sm text-muted-foreground hover:text-white hover:bg-secondary/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <MessageCircle className="h-4 w-4 mr-3" />
                  Личные сообщения
                  {directUnread > 0 && (
                    <span className="ml-auto inline-flex min-w-[1.5rem] justify-center rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
                      {directUnread > 9 ? '9+' : directUnread}
                    </span>
                  )}
                </Link>
                <Link
                  to="/api-docs"
                  className="flex items-center px-4 py-3 text-sm text-muted-foreground hover:text-white hover:bg-secondary/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  📚 API Документация
                </Link>
                
                {isAuthenticated && (
                  <>
                    <hr className="my-2 border-border/30" />
                    <Link
                      to="/bookmarks"
                      className="flex items-center px-4 py-3 text-sm text-muted-foreground hover:text-white hover:bg-secondary/50 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Bookmark className="h-4 w-4 mr-3" />
                      Закладки
                    </Link>
                    <Link
                      to="/notifications"
                      className="flex items-center px-4 py-3 text-sm text-muted-foreground hover:text-white hover:bg-secondary/50 transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Bell className="h-4 w-4 mr-3" />
                      Уведомления
                    </Link>
                    
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center px-4 py-3 text-sm text-muted-foreground hover:text-white hover:bg-secondary/50 transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Админ панель
                      </Link>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
