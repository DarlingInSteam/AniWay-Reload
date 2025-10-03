import React from 'react'
import { UserProfile } from '@/types/profile'

interface StatItem {
  label: string
  value: React.ReactNode
  hint?: string
}

interface ProfileStatsStripProps {
  profile: UserProfile
  // favorites retained temporarily for backward compatibility though not displayed now
  extra?: { favorites?: number; achievements?: number; reviewsCount?: number }
}

export const ProfileStatsStrip: React.FC<ProfileStatsStripProps> = ({ profile, extra }) => {
  const formatJoinDate = (date: Date | string | undefined) => {
    if (!date) return '—'
    const d = typeof date === 'string' ? new Date(date) : date
    if (isNaN(d.getTime())) return '—'
    return new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: '2-digit'
    }).format(d)
  }
  const stats: StatItem[] = [
    { label: 'Манги', value: profile.mangaRead ?? 0 },
    { label: 'Глав', value: profile.chaptersRead ?? 0 },
    // Replaced Избранное with Обзоры (reviews authored by user)
    { label: 'Обзоры', value: extra?.reviewsCount ?? 0 },
    { label: 'Достижений', value: extra?.achievements ?? 0 },
    { label: 'Комментарии', value: profile.commentsCount ?? 0 },
    { label: 'Лайки', value: profile.likesGivenCount ?? 0 },
  { label: 'Присоединился', value: formatJoinDate(profile.joinedDate) }
  ]
  return (
    <div className="mt-4 w-full">
      <div
        className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-7 gap-2
        [--stat-min:140px]
        sm:[--stat-min:120px]
        md:[--stat-min:110px]
        lg:[--stat-min:100px]
        overflow-x-auto md:overflow-visible pb-1 md:pb-0 snap-x snap-mandatory scroll-smooth scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        role="list" aria-label="Статистика пользователя"
      >
        {stats.map(s => (
          <div
            key={s.label}
            role="listitem"
            className="relative group glass-inline rounded-xl px-3 py-3 flex flex-col items-start transition-colors hover:bg-white/10 hover:border-white/20 min-w-[var(--stat-min)] snap-start"
          >
            <div className="text-[10px] uppercase tracking-wide text-slate-400 font-medium whitespace-nowrap">{s.label}</div>
            <div className="text-lg font-semibold text-white/90 group-hover:text-white transition">{s.value}</div>
            <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition bg-primary/5 pointer-events-none" />
          </div>
        ))}
      </div>
    </div>
  )
}
