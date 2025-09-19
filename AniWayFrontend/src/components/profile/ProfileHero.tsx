import React from 'react'
import { UserProfile } from '@/types/profile'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Camera, Edit, Share2, MoreHorizontal } from 'lucide-react'

interface ProfileHeroProps {
  profile: UserProfile
  isOwn: boolean
  onEdit?: () => void
  onShare?: () => void
  onMore?: () => void
}

export const ProfileHero: React.FC<ProfileHeroProps> = ({ profile, isOwn, onEdit, onShare, onMore }) => {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-[#14171d]">
      {/* Subtle vignette + accent haze */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_25%,rgba(56,132,255,0.18),transparent_65%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_55%,rgba(0,0,0,0.85))]" />
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
        {/* Right side showcase placeholder (desktop) */}
        <div className="hidden lg:flex flex-col gap-3 w-72">
          <div className="text-sm font-medium text-slate-200 tracking-wide">Избранное</div>
          <div className="grid grid-cols-3 gap-2">
            {[0,1,2].map(i => (
              <div key={i} className="aspect-[2/3] rounded-md bg-primary/10 border border-white/10" />
            ))}
          </div>
          <div className="text-xs text-slate-400">Слот витрины (будет заполнен реальными данными)</div>
        </div>
      </div>
    </div>
  )
}
