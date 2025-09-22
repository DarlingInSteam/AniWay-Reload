import React from 'react'
import { UserReadingProgress } from '@/types/profile'
import { Progress } from '@/components/ui/progress'
import { ProfilePanel } from './ProfilePanel'

interface ProfileReadingProgressProps {
  items: UserReadingProgress[]
}

export const ProfileReadingProgress: React.FC<ProfileReadingProgressProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <ProfilePanel title="Читаю сейчас">
        <div className="text-sm text-slate-400">Нет активного чтения</div>
      </ProfilePanel>
    )
  }
  return (
  <ProfilePanel title="Читаю сейчас">
      <div className="space-y-4">
        {items.map(item => {
          const pct = item.totalChapters ? (item.currentChapter / item.totalChapters) * 100 : 0
          return (
            <div key={item.mangaId} className="flex gap-4">
              <div className="w-14 h-20 overflow-hidden rounded-md bg-black/30 ring-1 ring-white/10">
                <img src={item.coverImage} alt={item.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-4 mb-1">
                  <h3 className="text-sm font-medium text-white/90 truncate">{item.title}</h3>
                  <span className="text-[11px] text-slate-400 shrink-0">{Math.round(pct)}%</span>
                </div>
                <div className="text-xs text-slate-500 mb-2">Глава {item.currentChapter} из {item.totalChapters}</div>
                <Progress value={pct} className="h-2" />
              </div>
            </div>
          )
        })}
      </div>
    </ProfilePanel>
  )
}
