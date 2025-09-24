import React, { useRef, useState, useEffect, useMemo } from 'react'
import { apiClient } from '@/lib/api'
import { UserProfile } from '@/types/profile'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Camera, Edit } from 'lucide-react'
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer'
import { profileService } from '@/services/profileService'
import { Progress } from '@/components/ui/progress'
import GlassPanel from '@/components/ui/GlassPanel'

interface ProfileHeroProps {
  profile: UserProfile
  isOwn: boolean
  onEdit?: () => void
  onAvatarUpdated?: (newUrl: string) => void
}

const AvatarSection: React.FC<{ profile: UserProfile; isOwn: boolean; uploading: boolean; avatarError: string | null; avatarSuccess: string | null; fileInputRef: React.RefObject<HTMLInputElement>; onPick: () => void; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; computedAvatarUrl: string; }> = ({ profile, isOwn, uploading, avatarError, avatarSuccess, fileInputRef, onPick, onChange, computedAvatarUrl }) => (
  <div className="flex flex-col items-center md:items-start gap-3 shrink-0">
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
    <div className="flex items-center gap-2 text-sm text-slate-300">
      <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 border border-white/10 text-xs tracking-wide uppercase text-slate-300">{profile.role}</span>
      <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs tracking-wide uppercase ${profile.isOnline ? 'bg-primary/20 text-primary font-medium' : 'bg-slate-600/30 text-slate-300'}`}>{profile.isOnline ? 'В СЕТИ' : 'ОФЛАЙН'}</span>
    </div>
  </div>
)

const LevelPanel: React.FC<{ userLevel: number; gained: number; xpNext: number; totalActivity: number; pct: number; profile: UserProfile; }> = ({ userLevel, gained, xpNext, totalActivity, pct, profile }) => (
  <div className="hidden lg:flex flex-col w-72">
    <GlassPanel className="p-4 flex flex-col gap-4" padding="none">
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-wide text-slate-400 uppercase">Уровень</span>
        <span className="text-sm font-semibold text-white">{userLevel}</span>
      </div>
      <div>
        <div className="flex justify-between text-[11px] text-slate-500 mb-1">
          <span>{gained} XP</span>
          <span>{xpNext} XP</span>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="mt-1 text-[11px] text-slate-500">{userLevel>=10? 'MAX' : `До след.: ${Math.max(0, xpNext-totalActivity)} XP`}</div>
      </div>
      <div className="flex flex-col gap-1 text-[11px] text-slate-500">
        <div><span className="text-slate-300">Манги:</span> {profile.mangaRead}</div>
        <div><span className="text-slate-300">Глав:</span> {profile.chaptersRead}</div>
      </div>
    </GlassPanel>
  </div>
)

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

  // Level logic (extracted from legacy header)
  const levels = [
    { level: 1, xpRequired: 0 },
    { level: 2, xpRequired: 50 },
    { level: 3, xpRequired: 150 },
    { level: 4, xpRequired: 300 },
    { level: 5, xpRequired: 500 },
    { level: 6, xpRequired: 750 },
    { level: 7, xpRequired: 1000 },
    { level: 8, xpRequired: 1500 },
    { level: 9, xpRequired: 2000 },
    { level: 10, xpRequired: 3000 },
  ]
  const totalActivity = (profile.mangaRead || 0) * 10 + (profile.chaptersRead || 0)
  let userLevel = 1
  for (let i = levels.length - 1; i >= 0; i--) {
    if (totalActivity >= levels[i].xpRequired) { userLevel = levels[i].level; break }
  }
  const current = levels[userLevel - 1]
  const next = levels[userLevel] || levels[levels.length - 1]
  const xpCurrent = current.xpRequired
  const xpNext = next.xpRequired
  const gained = totalActivity - xpCurrent
  const need = xpNext - xpCurrent
  const pct = userLevel >= 10 ? 100 : (need>0? Math.min(100, (gained/need)*100): 0)

  return (
    <GlassPanel className="w-full">
      <div className="relative px-6 pt-6 pb-5 md:px-10 md:pt-8 md:pb-8 flex flex-col md:flex-row gap-6 md:gap-10">
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
        {/* Main identity + actions */}
        <div className="flex-1 flex flex-col">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white drop-shadow-sm flex items-center gap-2">
                {profile.displayName || profile.username}
              </h1>
              {profile.displayName && (
                <div className="text-slate-300 text-sm">@{profile.username}</div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {isOwn && (
                <Button size="sm" variant="outline" className="bg-primary/25 hover:bg-primary/35 border-primary/40 text-white shadow-sm hover:shadow transition" onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-1" /> Редактировать профиль
                </Button>
              )}
            </div>
          </div>
          {/* Optional quick note / short bio line */}
          {profile.bio && (
            <div className="mt-4 max-w-2xl text-slate-300 text-sm leading-relaxed markdown-body">
              <MarkdownRenderer value={profile.bio} />
            </div>
          )}
        </div>
        <LevelPanel userLevel={userLevel} gained={gained} xpNext={xpNext} totalActivity={totalActivity} pct={pct} profile={profile} />
      </div>
    </GlassPanel>
  )
}
