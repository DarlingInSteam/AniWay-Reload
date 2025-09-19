import React from 'react'
import { UserProfile } from '@/types/profile'

interface StatItem {
  label: string
  value: React.ReactNode
  hint?: string
}

interface ProfileStatsStripProps {
  profile: UserProfile
  extra?: { favorites?: number; achievements?: number }
}

export const ProfileStatsStrip: React.FC<ProfileStatsStripProps> = ({ profile, extra }) => {
  const stats: StatItem[] = [
    { label: 'Манги', value: profile.mangaRead ?? 0 },
    { label: 'Глав', value: profile.chaptersRead ?? 0 },
    { label: 'Избранное', value: extra?.favorites ?? 0 },
    { label: 'Достижений', value: extra?.achievements ?? 0 },
    { label: 'Комментарии', value: profile.commentsCount ?? 0 },
    { label: 'Лайки', value: profile.likesGivenCount ?? 0 },
    { label: 'Присоединился', value: new Date(profile.joinedDate).getFullYear() }
  ]
  return (
    <div className="mt-4 w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
      {stats.map(s => (
        <div key={s.label} className="relative group rounded-xl bg-white/5 border border-white/10 px-3 py-3 flex flex-col items-start">
          <div className="text-xs uppercase tracking-wide text-slate-400 font-medium">{s.label}</div>
          <div className="text-lg font-semibold text-white">{s.value}</div>
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
        </div>
      ))}
    </div>
  )
}
