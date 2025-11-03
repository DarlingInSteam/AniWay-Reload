import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, Search, Trophy, MessageSquare, MessageCircle, Globe2, User, Bell, Bookmark, MoreHorizontal, ChevronUp, Settings } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { useEffect, useState, useRef, useMemo } from 'react'
import { useNotifications } from '@/notifications/NotificationContext'

// Bottom mobile navigation bar with safe-area support
export function MobileNavBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, isAdmin, user } = useAuth()
  const { unread } = useNotifications()
  const [hasScrolled, setHasScrolled] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [hiddenByMomentViewer, setHiddenByMomentViewer] = useState<boolean>(() => {
    if (typeof document === 'undefined') {
      return false
    }
    return document.body.classList.contains('moment-viewer-active')
  })
  const sheetRef = useRef<HTMLDivElement|null>(null)
  const navRef = useRef<HTMLElement|null>(null)

  useEffect(()=>{
    const onScroll = () => setHasScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const handleVisibility = (event: Event) => {
      const { detail } = event as CustomEvent<boolean>
      const nextHidden = Boolean(detail)
      setHiddenByMomentViewer(nextHidden)
      if (!nextHidden) {
        setMoreOpen(false)
      }
    }

    window.addEventListener('moment-viewer-visibility', handleVisibility as EventListener)
    return () => window.removeEventListener('moment-viewer-visibility', handleVisibility as EventListener)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }
    const nextHidden = document.body.classList.contains('moment-viewer-active')
    setHiddenByMomentViewer(nextHidden)
    if (nextHidden) {
      setMoreOpen(false)
    }
  }, [location.pathname])

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

  const sheetLinks = useMemo(() => {
    const links = [
      { to: '/chat', icon: Globe2, label: 'Глобальный чат', desc: 'Общение с сообществом' },
      {
        to: isAuthenticated ? '/messages' : '/login',
        icon: MessageCircle,
        label: 'Личные сообщения',
        desc: isAuthenticated ? 'Диалоги и друзья' : 'Войдите, чтобы переписываться',
      },
      { to: '/tops', icon: Trophy, label: 'Топы', desc: 'Рейтинги активности' },
      { to: '/forum', icon: MessageSquare, label: 'Форум', desc: 'Обсуждения и темы' },
    ]
    if (isAuthenticated && isAdmin) {
      links.unshift({ to: '/admin', icon: Settings, label: 'Админ панель', desc: 'Управление контентом' })
    }
    return links
  }, [isAuthenticated, isAdmin])

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
        'md:hidden fixed bottom-0 inset-x-0 z-[60] backdrop-blur-xl border-t border-white/20 bg-[#0b0d11]/90 supports-[backdrop-filter]:bg-[#0b0d11]/80 transition-all duration-300 ease-in-out',
        hasScrolled && 'shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.75)]',
        hiddenByMomentViewer && 'translate-y-full opacity-0 pointer-events-none'
      )}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 4px)' }}
    >
      <div className="flex items-stretch justify-between gap-0 px-1 py-1 select-none">
        {[
          ...primaryLeft,
          { to: '/search', icon: Search, label: 'Поиск', match:(p:string)=> p.startsWith('/search') },
          ...primaryRight,
          { to: '__more__', icon: MoreHorizontal, label: 'Ещё', match:()=> false, more:true }
        ].map(item => {
          const Icon = item.icon
          const active = item.more ? moreOpen : item.match(location.pathname)
          const isMore = !!item.more
          const onClick = (e: any) => {
            if(isMore){ e.preventDefault(); setMoreOpen(o=>!o); return }
            if(isMore) return
          }
          return (
            <div key={item.to+item.label} className="flex-1 flex">
              <NavLink
                to={isMore ? '#' : item.to}
                onClick={onClick}
                className={({isActive}) => cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 min-w-[54px] px-1 text-[10px]',
                  'text-white/55 hover:text-white transition-colors',
                  (isActive || active) && 'text-white'
                )}
              >
                <div className={cn(
                  'relative w-9 h-9 flex items-center justify-center rounded-full transition-all',
                  (active) && 'bg-white/10 ring-1 ring-white/15'
                )}>
                  <Icon className="w-5 h-5" />
                  {item.to === '/notifications' && unread>0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-5 px-1 rounded-full bg-sky-500 text-[10px] font-semibold flex items-center justify-center text-white ring-2 ring-[#0b0d11]">{unread>99?'99+':unread}</span>
                  )}
                </div>
                <span className="leading-none">{item.label}</span>
              </NavLink>
            </div>
          )
        })}
      </div>
      {/* Overlay for sheet */}
  <div className={cn('fixed inset-0 z-[58] md:hidden transition-opacity duration-300', moreOpen ? 'opacity-80 pointer-events-auto' : 'opacity-0 pointer-events-none')} style={{background:'radial-gradient(circle at 50% 90%, rgba(0,0,0,0.85), rgba(0,0,0,0.92) 60%, rgba(0,0,0,0.95))'}} />
      {/* Expandable sheet */}
      <div ref={sheetRef} className={cn('absolute left-0 right-0 bottom-full pb-4 z-[66]', moreOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none', 'transition-all duration-300')}> 
        <div className="mx-4 rounded-2xl overflow-hidden border border-white/25 bg-[#050507]/95 backdrop-blur-xl shadow-[0_8px_42px_-6px_rgba(0,0,0,0.85)]">
          <div className="flex items-center justify-between p-3 border-b border-white/10">
            <span className="text-xs font-semibold text-white/70">Быстрые разделы</span>
            <button 
              onClick={()=> setMoreOpen(false)} 
              className="p-1 rounded-lg hover:bg-white/10"
              aria-label="Скрыть разделы"
              title="Скрыть разделы"
            >
              <ChevronUp className="w-4 h-4 text-white/60"/>
            </button>
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
