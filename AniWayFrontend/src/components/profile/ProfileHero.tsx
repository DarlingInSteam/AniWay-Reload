import React from 'react'
import { UserProfile } from '@/types/profile'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Camera, Edit, Share2, MoreHorizontal } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface ProfileHeroProps {
  profile: UserProfile
  isOwn: boolean
  onEdit?: () => void
  onShare?: () => void
  onMore?: () => void
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({ profile, isOwn, onEdit, onShare, onMore }) => {
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
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-background">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(59,130,246,0.12),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_55%,rgba(0,0,0,0.7))]" />
      </div>
      <div className="relative px-6 pt-6 pb-5 md:px-10 md:pt-8 md:pb-8 flex flex-col md:flex-row gap-6 md:gap-10">
        {/* Avatar + level */}
        <div className="flex flex-col items-center md:items-start gap-3 shrink-0">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-primary/40 via-primary/10 to-transparent blur-sm opacity-70 group-hover:opacity-95 transition" />
            <Avatar className="relative w-40 h-40 rounded-xl ring-2 ring-white/15 shadow-lg">
              <AvatarImage src={profile.avatar || '/placeholder-avatar.png'} />
              <AvatarFallback className="bg-slate-700 text-3xl text-white font-semibold">
                {profile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isOwn && (
              <button className="absolute bottom-2 right-2 p-2 rounded-md bg-black/60 hover:bg-black/70 text-white border border-white/20 shadow transition" aria-label="Изменить аватар">
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 border border-white/10 text-xs tracking-wide uppercase text-slate-300">{profile.role}</span>
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs tracking-wide uppercase ${profile.isOnline ? 'bg-primary/20 text-primary font-medium' : 'bg-slate-600/30 text-slate-300'}`}>{profile.isOnline ? 'В СЕТИ' : 'ОФЛАЙН'}</span>
          </div>
        </div>
        {/* Main identity + actions */}
        <div className="flex-1 flex flex-col">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white drop-shadow-sm">
                {profile.displayName || profile.username}
              </h1>
              {profile.displayName && (
                <div className="text-slate-300 text-sm">@{profile.username}</div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {isOwn && (
                <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/15 border-white/15" onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-1" /> Редактировать
                </Button>
              )}
              <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/15 border-white/15" onClick={onShare}>
                <Share2 className="w-4 h-4 mr-1" /> Поделиться
              </Button>
              <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/15 border-white/15" onClick={onMore}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {/* Optional quick note / short bio line */}
          {profile.bio && (
            <p className="mt-4 max-w-2xl text-slate-300 text-sm leading-relaxed line-clamp-3">{profile.bio}</p>
          )}
        </div>
        {/* Right side level panel */}
        <div className="hidden lg:flex flex-col w-72">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col gap-4">
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
          </div>
        </div>
      </div>
    </div>
  )
}
