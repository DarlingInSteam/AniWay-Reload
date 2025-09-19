import React from 'react'

export const ProfileBadgesPlaceholder: React.FC = () => {
  return (
  <div className="rounded-2xl bg-[#1a1d22] border border-white/10 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Бэйджи</h2>
        <span className="text-xs text-slate-400">Скоро</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {Array.from({length:8}).map((_,i)=>(
          <div key={i} className="aspect-square rounded-md bg-black/30 border border-white/10 flex items-center justify-center text-slate-600 text-xs font-medium">--</div>
        ))}
      </div>
      <p className="text-xs text-slate-400">Здесь будут отображаться заработанные награды.</p>
    </div>
  )
}
