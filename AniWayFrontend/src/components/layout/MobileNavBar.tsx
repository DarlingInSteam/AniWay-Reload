import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, Search, Trophy, MessageSquare, User, Bell, Bookmark, MoreHorizontal, ChevronUp } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { useEffect, useState, useRef } from 'react'
import { useNotifications } from '@/notifications/NotificationContext'

// Bottom mobile navigation bar with safe-area support
export function MobileNavBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const { unread } = useNotifications()
  const [hasScrolled, setHasScrolled] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement|null>(null)

  useEffect(()=>{
    const onScroll = () => setHasScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Primary bar: Home | Bookmarks? | Search (center large) | Notifications | Profile/Login | More
  // Forum & Tops moved into expandable sheet

  const primaryLeft: any[] = [
    { to: '/', icon: Home, label: 'Главная', match: (p:string)=> p==='/' || p.startsWith('/catalog') }
  ]
  if(isAuthenticated){
    primaryLeft.push({ to: '/bookmarks', icon: Bookmark, label: 'Закладки', match: (p:string)=> p.startsWith('/bookmarks') })
  }

  const primaryRight: any[] = []
  primaryRight.push({ to: '/notifications', icon: Bell, label: 'Уведомл.', match: (p:string)=> p.startsWith('/notifications') })
  if(isAuthenticated){
    primaryRight.push({ to: `/profile/${user?.id ?? ''}`, icon: User, label: 'Профиль', match:(p:string)=> p.startsWith('/profile') })
  } else {
    primaryRight.push({ to: '/login', icon: User, label: 'Войти', match:(p:string)=> p.startsWith('/login') })
  }

  const sheetLinks = [
    { to: '/tops', icon: Trophy, label: 'Топы', desc: 'Рейтинги активности' },
    { to: '/forum', icon: MessageSquare, label: 'Форум', desc: 'Обсуждения и темы' },
  ]

  return (
    <nav className={cn('md:hidden fixed bottom-0 inset-x-0 z-50','backdrop-blur-lg border-t border-white/15 bg-manga-black/92 transition-shadow', hasScrolled && 'shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.5)]')}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-stretch justify-between px-1">
        <ul className="flex items-stretch">
          {primaryLeft.map(item => {
            const Icon = item.icon; const active = item.match(location.pathname)
            return (
              <li key={item.to}>
                <NavLink to={item.to} className={cn('px-2 flex flex-col items-center justify-center text-[10px] gap-0.5 min-w-[56px]', 'text-white/55 hover:text-white', active && 'text-white')}> 
                  <div className={cn('w-9 h-9 flex items-center justify-center rounded-full', active && 'bg-white/10 ring-1 ring-white/15')}><Icon className="w-5 h-5"/></div>
                  <span className="leading-none">{item.label}</span>
                </NavLink>
              </li>)
          })}
        </ul>
        {/* Center Search button */}
        <button onClick={()=> navigate('/search')} className="-mt-6 relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-pink-500 shadow-lg shadow-pink-800/30 ring-2 ring-white/10 active:scale-95 transition">
          <Search className="w-7 h-7 text-white" />
        </button>
        <ul className="flex items-stretch">
          {primaryRight.map(item => { const Icon = item.icon; const active = item.match(location.pathname); return (
            <li key={item.to}>
              <NavLink to={item.to} className={cn('px-2 flex flex-col items-center justify-center text-[10px] gap-0.5 min-w-[56px]', 'text-white/55 hover:text-white', active && 'text-white')}>
                <div className={cn('relative w-9 h-9 flex items-center justify-center rounded-full', active && 'bg-white/10 ring-1 ring-white/15')}>
                  <Icon className="w-5 h-5" />
                  {item.to==='/notifications' && unread>0 && (
                    <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-sky-500 text-[10px] font-semibold flex items-center justify-center text-white ring-2 ring-manga-black">{unread>99?'99+':unread}</span>
                  )}
                </div>
                <span className="leading-none">{item.label}</span>
              </NavLink>
            </li>) })}
          <li>
            <button onClick={()=> setMoreOpen(o=> !o)} className={cn('px-2 flex flex-col items-center justify-center text-[10px] gap-0.5 min-w-[56px] text-white/55 hover:text-white', moreOpen && 'text-white')}> 
              <div className={cn('w-9 h-9 flex items-center justify-center rounded-full', moreOpen && 'bg-white/10 ring-1 ring-white/15')}>
                <MoreHorizontal className="w-5 h-5" />
              </div>
              <span className="leading-none">Ещё</span>
            </button>
          </li>
        </ul>
      </div>
      {/* Expandable sheet */}
      <div ref={sheetRef} className={cn('absolute left-0 right-0 bottom-full pb-2 pointer-events-none', moreOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2', 'transition-all duration-300')}> 
        <div className="mx-4 rounded-2xl overflow-hidden border border-white/15 backdrop-blur-xl bg-manga-black/90 pointer-events-auto shadow-2xl">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <span className="text-xs font-semibold text-white/70">Быстрые разделы</span>
            <button onClick={()=> setMoreOpen(false)} className="p-1 rounded-lg hover:bg-white/10"><ChevronUp className="w-4 h-4 text-white/60"/></button>
          </div>
          <ul className="divide-y divide-white/5">
            {sheetLinks.map(l => { const Icon=l.icon; return (
              <li key={l.to}>
                <button onClick={()=> { navigate(l.to); setMoreOpen(false) }} className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/5 active:bg-white/10 transition">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ring-1 ring-white/10"><Icon className="w-5 h-5 text-white/70"/></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white/80 truncate">{l.label}</div>
                    <div className="text-[11px] text-white/40 truncate">{l.desc}</div>
                  </div>
                </button>
              </li>) })}
          </ul>
        </div>
      </div>
    </nav>
  )
}
