import React, { useRef, useState, useEffect, useMemo } from 'react'
import { apiClient } from '@/lib/api'
import { UserProfile } from '@/types/profile'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Camera, Edit, ChevronDown } from 'lucide-react'
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer'
import { profileService } from '@/services/profileService'
import { Progress } from '@/components/ui/progress'
import GlassPanel from '@/components/ui/GlassPanel'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import XpHistoryList from '@/components/profile/XpHistoryList'
import { useUserLevel } from '@/hooks/useUserLevel'

interface ProfileHeroProps {
  profile: UserProfile
  isOwn: boolean
  onEdit?: () => void
  onAvatarUpdated?: (newUrl: string) => void
}

const AvatarSection: React.FC<{ profile: UserProfile; isOwn: boolean; uploading: boolean; avatarError: string | null; avatarSuccess: string | null; fileInputRef: React.RefObject<HTMLInputElement>; onPick: () => void; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; computedAvatarUrl: string; }> = ({ profile, isOwn, uploading, avatarError, avatarSuccess, fileInputRef, onPick, onChange, computedAvatarUrl }) => (
  <div className="hidden md:flex flex-col items-center md:items-start gap-3 shrink-0">
    <div className="relative group">
      <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-primary/40 via-primary/10 to-transparent blur-sm opacity-70 group-hover:opacity-95 transition" />
      <Avatar className="relative w-40 h-40 rounded-xl ring-2 ring-white/15 shadow-lg">
        <AvatarImage src={computedAvatarUrl || '/icon.png'} />
        <AvatarFallback className="bg-slate-700 text-3xl text-white font-semibold">
          {profile.username.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {isOwn && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={onChange}
          />
          <button
            className="absolute bottom-2 right-2 p-2 rounded-md bg-black/60 hover:bg-black/70 text-white border border-white/20 shadow transition disabled:opacity-50 disabled:pointer-events-none"
            aria-label="Изменить аватар"
            onClick={onPick}
            disabled={uploading}
          >
            {uploading ? (
              <span className="w-4 h-4 inline-block animate-spin border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
          </button>
          {(avatarError || avatarSuccess) && (
            <div className="absolute -bottom-5 left-0 w-full text-center text-[11px] font-medium select-none">
              {avatarError && <span className="text-red-400">{avatarError}</span>}
              {avatarSuccess && <span className="text-green-400">{avatarSuccess}</span>}
            </div>
          )}
        </>
      )}
    </div>
  </div>
)

const LevelPanel: React.FC<{ profile: UserProfile; variant?: 'desktop'|'mobile'|'badge' }> = ({ profile, variant='desktop' }) => {
  const userId = parseInt(profile.id)
  const { data: levelData, isLoading, isError } = useUserLevel(userId)
  const [open, setOpen] = useState(false)

  // Fallback to simple derived activity if backend not yet responding
  const totalActivity = (profile.mangaRead || 0) * 10 + (profile.chaptersRead || 0)
  const derivedLevel = Math.max(1, Math.min(10, Math.floor(totalActivity / 50) + 1))
  const level = levelData?.level ?? derivedLevel
  const xpInto = levelData?.xpIntoCurrentLevel ?? 0
  const xpForNext = levelData?.xpForNextLevel ?? 50
  const pct = levelData ? Math.min(100, (levelData.progress * 100)) : Math.min(100, (xpInto / xpForNext) * 100)
  const remaining = levelData ? Math.max(0, levelData.xpForNextLevel - levelData.xpIntoCurrentLevel) : Math.max(0, xpForNext - xpInto)

  if (variant === 'badge') {
    return (
      <button
        onClick={() => setOpen(true)}
        className="relative group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 active:scale-[0.97] transition focus:outline-none focus:ring-2 focus:ring-primary/50"
        aria-label="Открыть прогресс уровня"
      >
        <span className="text-xs font-semibold text-white/90 leading-none">Lv. {isLoading ? '…' : level}</span>
        <div className="w-16 h-1.5 rounded bg-slate-700/60 overflow-hidden">
          <div className="h-full bg-primary/70 transition-all" style={{ width: pct + '%' }} />
        </div>
        <span className="text-[10px] text-slate-400">{xpInto}/{xpForNext}</span>
      </button>
    )
  }

  const baseCard = (
    <GlassPanel
        onClick={() => setOpen(true)}
        padding="none"
        className={`relative p-4 flex flex-col gap-4 cursor-pointer transition-shadow group overflow-hidden
        before:absolute before:inset-0 before:pointer-events-none before:rounded-[inherit]
        before:bg-gradient-to-br before:from-slate-900/50 before:via-slate-800/40 before:to-slate-900/20
        hover:shadow-lg hover:shadow-black/40 ${variant==='mobile' ? 'min-w-[200px]' : ''}`}>        
        {/* Subtle top accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] tracking-wide text-slate-300/80 uppercase">Уровень</span>
            <span className="text-2xl font-semibold text-white/90 drop-shadow-sm leading-snug">{isLoading ? '…' : level}</span>
          </div>
          <div className="flex flex-col items-end gap-1 text-[10px] text-slate-400">
            <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] tracking-wide uppercase">XP</span>
            <span className="font-medium text-slate-300/90">{xpInto}/{xpForNext}</span>
          </div>
        </div>
        <div className="mt-1">
          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
            <span>{xpInto} XP</span>
            <span>{xpForNext} XP</span>
          </div>
          <Progress
            value={pct}
            className="h-2 bg-slate-800/70 border border-white/10 relative overflow-hidden after:absolute after:inset-0 after:bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.08),transparent)] after:opacity-0 group-hover:after:opacity-100 after:transition-opacity" />
          <div className="mt-1 text-[10px] text-slate-400/80 tracking-wide">
            {level >= 10 ? 'MAX' : `До след.: ${remaining} XP`}
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 text-[11px] text-slate-400/80 mt-1">
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-300/90">Манги</span>
            <span className="text-white/90 font-medium">{profile.mangaRead}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-300/90">Глав</span>
            <span className="text-white/90 font-medium">{profile.chaptersRead}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-300/90">Ост.</span>
            <span className="text-primary/90 font-medium">{level >= 10 ? 0 : remaining}</span>
          </div>
        </div>
        {isError && (
          <div className="text-[10px] text-amber-400 mt-1">Нет данных уровня (fallback)</div>
        )}
        {/* Soft corner glow */}
        <div className="pointer-events-none absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-70 transition-opacity" />
      </GlassPanel>
  )

  const isDesktopVariant = variant === 'desktop'
  const isMobilePanel = variant === 'mobile'
  const showCard = variant === 'desktop' || variant === 'mobile'
  return (
    <div className={`${isDesktopVariant ? 'hidden lg:flex flex-col w-72' : isMobilePanel ? 'flex lg:hidden w-full mt-2' : ''}`}>
      {showCard && baseCard}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl bg-neutral-900/95 border border-white/10 max-h-[80vh] p-0 flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white">История опыта</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-4">
            <div className="text-xs text-slate-400 mb-3">Недавние действия и начисления XP</div>
            <div className="overflow-y-auto pr-1 custom-scrollbar" style={{maxHeight:'60vh'}}>
              <XpHistoryList userId={userId} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({ profile, isOwn, onEdit, onAvatarUpdated }) => {
  // Avatar upload logic (build tag removed per design cleanup)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [avatarSuccess, setAvatarSuccess] = useState<string | null>(null)

  useEffect(() => { if (avatarSuccess) { const t = setTimeout(()=>setAvatarSuccess(null), 2500); return ()=>clearTimeout(t) } }, [avatarSuccess])

  const validateAvatar = (file: File): string | null => {
    if (file.size > 5 * 1024 * 1024) return 'Файл >5MB'
    if (!file.type.startsWith('image/')) return 'Не изображение'
    const allowed = ['image/jpeg','image/png','image/webp']
    if (!allowed.includes(file.type)) return 'JPEG/PNG/WebP'
    return null
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const v = validateAvatar(file)
    if (v) { setAvatarError(v); if (fileInputRef.current) fileInputRef.current.value=''; return }
    setAvatarError(null)
    setAvatarSuccess(null)
    setUploading(true)
    try {
      const res = await profileService.uploadAvatar(file)
      if (res.success) {
        const busted = res.avatarUrl ? `${res.avatarUrl}${res.avatarUrl.includes('?') ? '&' : '?'}v=${Date.now()}` : ''
        setAvatarSuccess('Готово')
        onAvatarUpdated?.(busted)
      } else {
        setAvatarError(res.message || 'Ошибка')
      }
    } catch (ex: any) {
      setAvatarError(ex?.message || 'Сбой')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value=''
    }
  }

  // Computed avatar URL with fallback construction if backend didn't yet return avatar in profile
  const computedAvatarUrl = useMemo(() => {
    const base = profile.avatar?.trim()
    if (base) return base
    // heuristic fallback path (adjust if gateway path differs)
    // We'll attempt /images/avatars/{userId}
    const userId = (profile as any).id || (profile as any).userId
    if (!userId) return '/icon.png'
    const guess = `/images/avatars/${userId}`
    return guess
  }, [profile.avatar, (profile as any).id])

  useEffect(() => {}, [profile.avatar, computedAvatarUrl])

  // If backend does not yet inject avatar into profile, try fetching avatar meta explicitly
  useEffect(() => {
    let cancelled = false
    if (!profile.avatar) {
      const userId = (profile as any).id || (profile as any).userId
      if (userId) {
        apiClient.getUserAvatar(userId).then(url => {
          if (!cancelled && url) {
            const busted = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`
            onAvatarUpdated?.(busted)
          }
        })
      }
    }
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.avatar, (profile as any).id])


  const [bioExpanded, setBioExpanded] = useState(false)
  const safeBio = profile.bio || ''
  const hasBio = safeBio.length > 0
  // Measure bio height (mobile) to decide if toggle is needed (> 3 lines)
  const bioMeasureRef = useRef<HTMLDivElement | null>(null)
  const [canToggleBio, setCanToggleBio] = useState(false)
  useEffect(() => {
    if (!hasBio) { setCanToggleBio(false); return }
    const el = bioMeasureRef.current
    if (!el) return
    // line-clamp-4 approximates 4 * line-height; we want toggle only if content > 3 lines
    // We'll compute lines by dividing scrollHeight by computed line-height
    const style = window.getComputedStyle(el)
    const lineHeight = parseFloat(style.lineHeight || '0') || 0
    if (lineHeight > 0) {
      const lines = Math.round(el.scrollHeight / lineHeight)
      setCanToggleBio(lines > 3)
    } else {
      setCanToggleBio(el.scrollHeight > 0 && el.scrollHeight > 3 * 18)
    }
  }, [safeBio, hasBio])

  return (
    <GlassPanel className="w-full">
      {/* Desktop / Large layout */}
      <div className="hidden md:flex relative px-10 pt-8 pb-8 flex-row gap-10">
        <AvatarSection
          profile={profile}
          isOwn={isOwn}
          uploading={uploading}
          avatarError={avatarError}
          avatarSuccess={avatarSuccess}
          fileInputRef={fileInputRef}
          onPick={() => fileInputRef.current?.click()}
          onChange={handleAvatarChange}
          computedAvatarUrl={computedAvatarUrl}
        />
        <div className="flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-white drop-shadow-sm flex items-center gap-2">
                {profile.displayName || profile.username}
              </h1>
              {profile.displayName && (
                <div className="text-slate-300 text-sm">@{profile.username}</div>
              )}
              <div className="flex gap-2 text-sm text-slate-300">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 border border-white/10 text-[11px] tracking-wide uppercase">{profile.role}</span>
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] tracking-wide uppercase ${profile.isOnline ? 'bg-primary/20 text-primary font-medium' : 'bg-slate-600/30 text-slate-300'}`}>{profile.isOnline ? 'В СЕТИ' : 'ОФЛАЙН'}</span>
              </div>
            </div>
            {isOwn && (
              <Button size="sm" variant="outline" className="bg-primary/25 hover:bg-primary/35 border-primary/40 text-white shadow-sm hover:shadow transition" onClick={onEdit}>
                <Edit className="w-4 h-4 mr-1" /> Редактировать профиль
              </Button>
            )}
          </div>
          {hasBio && (
            <div className="mt-5 max-w-2xl text-slate-300 text-sm leading-relaxed markdown-body">
              <MarkdownRenderer value={safeBio} />
            </div>
          )}
        </div>
        <LevelPanel profile={profile} />
      </div>

      {/* Mobile layout (single-column refined) */}
      <div className="md:hidden px-4 pt-6 pb-6 flex flex-col gap-6">
        <div className="flex flex-col items-center text-center relative">
          <div className="relative">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/50 via-primary/10 to-transparent blur-sm opacity-80" />
            <Avatar className="relative w-32 h-32 rounded-2xl ring-2 ring-white/15 shadow-xl">
              <AvatarImage src={computedAvatarUrl || '/icon.png'} />
              <AvatarFallback className="bg-slate-700 text-3xl text-white font-semibold">
                {profile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {/* Move level badge out of overlap: render below avatar normally */}
            {isOwn && (
              <button
                className="absolute top-1 right-1 p-2 rounded-md bg-black/60 hover:bg-black/70 text-white border border-white/20 shadow transition"
                aria-label="Изменить аватар"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div className="mt-4 space-y-2 w-full">
            <h1 className="text-2xl font-semibold leading-snug text-white break-words">
              {profile.displayName || profile.username}
            </h1>
            {profile.displayName && (
              <div className="text-slate-400 text-xs break-all -mt-1">@{profile.username}</div>
            )}
            <div className="flex flex-wrap justify-center gap-2 pt-1 text-[11px]">
              <span className="px-2 py-0.5 rounded bg-white/10 border border-white/10 uppercase tracking-wide text-slate-300">{profile.role}</span>
              <span className={`px-2 py-0.5 rounded uppercase tracking-wide ${profile.isOnline ? 'bg-primary/20 text-primary font-medium' : 'bg-slate-600/30 text-slate-300'}`}>{profile.isOnline ? 'В СЕТИ' : 'ОФЛАЙН'}</span>
              {isOwn && (
                <Button size="sm" variant="outline" className="h-7 px-3 bg-primary/25 border-primary/40 text-white text-[11px]" onClick={onEdit}>
                  <Edit className="w-3 h-3 mr-1" /> Редактировать
                </Button>
              )}
            </div>
            <div className="flex justify-center pt-2">
              <LevelPanel profile={profile} variant='badge' />
            </div>
          </div>
        </div>
        {hasBio && (
          <div className="mt-1">
            <div ref={bioMeasureRef} className={`relative text-slate-300 text-sm leading-relaxed markdown-body ${bioExpanded ? '' : 'line-clamp-4'}`}>
              <MarkdownRenderer value={safeBio} />
              {!bioExpanded && canToggleBio && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-neutral-950/95 via-neutral-950/60 to-transparent" />
              )}
            </div>
            {canToggleBio && (
              <button
                onClick={() => setBioExpanded(v=>!v)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                aria-expanded={bioExpanded}
              >
                {bioExpanded ? 'Свернуть' : 'Читать полностью'} <ChevronDown className={`w-4 h-4 transition-transform ${bioExpanded ? 'rotate-180' : ''}`} />
              </button>
            )}
          </div>
        )}
      </div>
    </GlassPanel>
  )
}
