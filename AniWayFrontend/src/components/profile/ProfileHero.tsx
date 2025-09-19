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
    <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-white/10 shadow-xl">
      {/* Banner background (placeholder gradient) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.35),transparent_60%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0)_40%,rgba(0,0,0,0.65))]" />
      <div className="relative px-6 pt-6 pb-5 md:px-10 md:pt-8 md:pb-8 flex flex-col md:flex-row gap-6 md:gap-10">
        {/* Avatar + level */}
        <div className="flex flex-col items-center md:items-start gap-3 shrink-0">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-br from-indigo-400/40 via-fuchsia-400/30 to-emerald-400/30 blur opacity-60 group-hover:opacity-90 transition" />
            <Avatar className="relative w-40 h-40 rounded-xl ring-2 ring-white/15 shadow-lg">
              <AvatarImage src={profile.avatar || '/placeholder-avatar.png'} />
              <AvatarFallback className="bg-slate-700 text-3xl text-white font-semibold">
                {profile.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isOwn && (
              <button className="absolute bottom-2 right-2 p-2 rounded-md bg-black/60 hover:bg-black/70 text-white border border-white/20 shadow" aria-label="Изменить аватар">
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 border border-white/10">{profile.role}</span>
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded ${profile.isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-600/30 text-slate-300'}`}>{profile.isOnline ? 'В сети' : 'Не в сети'}</span>
          </div>
        </div>
        {/* Main identity + actions */}
        <div className="flex-1 flex flex-col">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white drop-shadow">{profile.displayName || profile.username}</h1>
              {profile.displayName && (
                <div className="text-slate-300 text-sm">@{profile.username}</div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {isOwn && (
                <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 border-white/20" onClick={onEdit}>
                  <Edit className="w-4 h-4 mr-1" /> Редактировать
                </Button>
              )}
              <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 border-white/20" onClick={onShare}>
                <Share2 className="w-4 h-4 mr-1" /> Поделиться
              </Button>
              <Button size="sm" variant="outline" className="bg-white/10 hover:bg-white/20 border-white/20" onClick={onMore}>
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
          {/* Optional quick note / short bio line */}
          {profile.bio && (
            <p className="mt-4 max-w-2xl text-slate-200 text-sm leading-relaxed line-clamp-3">{profile.bio}</p>
          )}
        </div>
        {/* Right side showcase placeholder (desktop) */}
        <div className="hidden lg:flex flex-col gap-3 w-72">
          <div className="text-sm font-medium text-slate-200 tracking-wide">Избранное</div>
          <div className="grid grid-cols-3 gap-2">
            {[0,1,2].map(i => (
              <div key={i} className="aspect-[2/3] rounded-md bg-white/10 animate-pulse" />
            ))}
          </div>
          <div className="text-xs text-slate-400">Слот витрины (будет заполнен реальными данными)</div>
        </div>
      </div>
    </div>
  )
}
