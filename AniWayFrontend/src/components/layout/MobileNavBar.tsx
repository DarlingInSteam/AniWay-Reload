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
  const navRef = useRef<HTMLElement|null>(null)

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

  // Close sheet on outside click or ESC
  useEffect(()=> {
    if(!moreOpen) return
    const handleDown = (e: MouseEvent) => {
      if(sheetRef.current && sheetRef.current.contains(e.target as Node)) return
      if(navRef.current && navRef.current.contains(e.target as Node)) {
        const btn = (e.target as HTMLElement).closest('[data-more-btn]')
        if(btn) return
      }
      setMoreOpen(false)
    }
    const handleKey = (e: KeyboardEvent) => { if(e.key==='Escape') setMoreOpen(false) }
    document.addEventListener('mousedown', handleDown)
    document.addEventListener('keydown', handleKey)
    return ()=> { document.removeEventListener('mousedown', handleDown); document.removeEventListener('keydown', handleKey) }
  }, [moreOpen])

  return (
    <nav
      ref={navRef}
      className={cn(
        'md:hidden fixed bottom-0 inset-x-0 z-[60] backdrop-blur-2xl border-t border-white/15 bg-[#07090d]/95',
        'supports-[backdrop-filter]:bg-[#07090dcc] transition-shadow',
        hasScrolled && 'shadow-[0_-6px_28px_-6px_rgba(0,0,0,0.85)]'
      )}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 4px)' }}
    >
      <div className="grid grid-cols-5 items-stretch px-1 py-1 gap-0 relative select-none">
        {/* Left group (may contain 1-2 items) */}
        <div className="flex items-stretch justify-start">
          {primaryLeft.map(item => {
            const Icon = item.icon; const active = item.match(location.pathname)
            return (
              <NavLink key={item.to} to={item.to} className={({isActive})=> cn(
                'flex-1 flex flex-col items-center justify-center text-[10px] gap-0.5 min-w-[54px] px-1',
                'text-white/55 hover:text-white',
                (isActive || active) && 'text-white'
              )}>
                <div className={cn('w-9 h-9 flex items-center justify-center rounded-full transition-colors', (active) && 'bg-white/10 ring-1 ring-white/15')}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="leading-none">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
        {/* Center search (dedicated col) */}
        <div className="flex items-stretch justify-center">
          <NavLink to="/search" className={({isActive})=> cn(
            'flex flex-col items-center justify-center text-[10px] gap-0.5 min-w-[54px] px-1',
            'text-white/55 hover:text-white',
            (isActive || location.pathname.startsWith('/search')) && 'text-white'
          )}>
            <div className={cn('w-9 h-9 flex items-center justify-center rounded-full transition-colors', location.pathname.startsWith('/search') && 'bg-white/10 ring-1 ring-white/15')}>
              <Search className="w-5 h-5" />
            </div>
            <span className="leading-none">Поиск</span>
          </NavLink>
        </div>
        {/* Right cluster (notifications, profile/login, more) */}
        <div className="col-span-3 flex items-stretch justify-end">
          {primaryRight.map(item => { const Icon = item.icon; const active = item.match(location.pathname); return (
            <NavLink key={item.to} to={item.to} className={({isActive})=> cn(
              'flex flex-col items-center justify-center text-[10px] gap-0.5 min-w-[54px] px-1',
              'text-white/55 hover:text-white',
              (isActive || active) && 'text-white'
            )}>
              <div className={cn('relative w-9 h-9 flex items-center justify-center rounded-full transition-colors', active && 'bg-white/10 ring-1 ring-white/15')}>
                <Icon className="w-5 h-5" />
                {item.to==='/notifications' && unread>0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-5 px-1 rounded-full bg-sky-500 text-[10px] font-semibold flex items-center justify-center text-white ring-2 ring-[#07090d]">{unread>99?'99+':unread}</span>
                )}
              </div>
              <span className="leading-none">{item.label}</span>
            </NavLink>
          )})}
          <button
            data-more-btn
            onClick={()=> setMoreOpen(o=> !o)}
            className={cn(
              'flex flex-col items-center justify-center text-[10px] gap-0.5 min-w-[54px] px-1 text-white/55 hover:text-white transition-colors',
              moreOpen && 'text-white'
            )}
          >
            <div className={cn('w-9 h-9 flex items-center justify-center rounded-full transition-colors', moreOpen && 'bg-white/10 ring-1 ring-white/15')}>
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="leading-none">Ещё</span>
          </button>
        </div>
      </div>
      {/* Overlay for sheet */}
  <div className={cn('fixed inset-0 z-[58] md:hidden transition-opacity duration-300', moreOpen ? 'opacity-80 pointer-events-auto' : 'opacity-0 pointer-events-none')} style={{background:'radial-gradient(circle at 50% 90%, rgba(0,0,0,0.85), rgba(0,0,0,0.92) 60%, rgba(0,0,0,0.95))'}} />
      {/* Expandable sheet */}
      <div ref={sheetRef} className={cn('absolute left-0 right-0 bottom-full pb-4 z-[66]', moreOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none', 'transition-all duration-300')}> 
        <div className="mx-4 rounded-2xl overflow-hidden border border-white/25 bg-[#050507]/95 backdrop-blur-xl shadow-[0_8px_42px_-6px_rgba(0,0,0,0.85)]">
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
