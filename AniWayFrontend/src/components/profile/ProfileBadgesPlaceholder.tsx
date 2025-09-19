import React from 'react'
import { ProfilePanel } from './ProfilePanel'

export const ProfileBadgesPlaceholder: React.FC = () => {
  return (
    <ProfilePanel title="Бэйджи" actions={<span className="text-xs text-slate-400">Скоро</span>}>
      <div className="grid grid-cols-4 gap-3 mb-2">
        {Array.from({length:8}).map((_,i)=>(
          <div key={i} className="aspect-square rounded-md bg-black/30 border border-white/10 flex items-center justify-center text-slate-600 text-xs font-medium">--</div>
        ))}
      </div>
      <p className="text-xs text-slate-400">Здесь будут отображаться заработанные награды.</p>
    </ProfilePanel>
  )
}
