import React from 'react'
import { UserActivity } from '@/types/profile'
import { Clock } from 'lucide-react'

interface ProfileActivityProps { activities: UserActivity[] }

export const ProfileActivity: React.FC<ProfileActivityProps> = ({ activities }) => {
  if (activities.length === 0) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-sm text-slate-400">Пока нет активности</div>
    )
  }
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
      <h2 className="text-lg font-semibold text-white">Активность</h2>
      <ul className="space-y-3">
        {activities.slice(0,12).map(a => (
          <li key={a.id} className="flex items-start gap-3 text-sm">
            <div className="w-6 h-6 rounded-md bg-indigo-500/20 flex items-center justify-center text-indigo-300 shrink-0">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 text-slate-200">
              <div>{a.description}</div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mt-0.5">{a.timestamp.toLocaleString()}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
