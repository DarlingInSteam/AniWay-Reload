import { NavLink, useLocation } from 'react-router-dom'
import { Home, Search, Trophy, MessageSquare, User, Bell, Bookmark } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { NotificationBell } from '@/notifications/NotificationBell'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

// Bottom mobile navigation bar with safe-area support
export function MobileNavBar() {
  const location = useLocation()
  const { isAuthenticated, user } = useAuth()
  const [hasScrolled, setHasScrolled] = useState(false)

  useEffect(()=>{
    const onScroll = () => setHasScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const items = [
    { to: '/', icon: Home, label: 'Главная', match: (p:string)=> p==='/' || p.startsWith('/catalog') },
    { to: '/search', icon: Search, label: 'Поиск', match: (p:string)=> p.startsWith('/search') },
    { to: '/tops', icon: Trophy, label: 'Топы', match: (p:string)=> p.startsWith('/tops') },
    { to: '/forum', icon: MessageSquare, label: 'Форум', match: (p:string)=> p.startsWith('/forum') },
  ]
  if(isAuthenticated){
    items.push({ to: '/bookmarks', icon: Bookmark, label: 'Закладки', match: (p:string)=> p.startsWith('/bookmarks') })
    items.push({ to: '/notifications', icon: Bell, label: 'Уведомл.', match: (p:string)=> p.startsWith('/notifications') })
    items.push({ to: `/profile/${user?.id ?? ''}` , icon: User, label: 'Профиль', match: (p:string)=> p.startsWith('/profile') })
  } else {
    items.push({ to: '/login', icon: User, label: 'Войти', match: (p:string)=> p.startsWith('/login') })
  }

  return (
    <nav className={cn('md:hidden fixed bottom-0 inset-x-0 z-50','backdrop-blur-lg border-t border-white/10 bg-manga-black/80 transition-shadow', hasScrolled && 'shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.4)]')}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <ul className="flex justify-around items-stretch">{
        items.map(item => {
          const Icon = item.icon
          const active = item.match(location.pathname)
          return (
            <li key={item.to} className="flex-1">
              <NavLink to={item.to}
                className={cn('flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium select-none',
                  'text-white/50 hover:text-white transition-colors',
                  active && 'text-white')}
              >
                <div className={cn('relative flex items-center justify-center w-9 h-9 rounded-full', active ? 'bg-white/10 ring-1 ring-white/15' : '')}>
                  <Icon className="w-5 h-5" />
                  {item.to==='/notifications' && isAuthenticated && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-fuchsia-500 animate-pulse ring-2 ring-manga-black" />
                  )}
                </div>
                <span className="truncate max-w-[60px] leading-tight">{item.label}</span>
              </NavLink>
            </li>
          )
        })
      }</ul>
    </nav>
  )
}
