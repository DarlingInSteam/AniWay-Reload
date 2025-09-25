import React, { useMemo } from 'react'
import { ForumThread } from '@/types/forum'

interface ForumStatsPanelProps { threads?: ForumThread[] }

export function ForumStatsPanel({ threads }: ForumStatsPanelProps){
  const stats = useMemo(()=>{
    if(!threads) return { total:0, today:0, pinned:0 }
    const now = Date.now()
    const oneDay = 24*60*60*1000
    let today=0, pinned=0
    for(const t of threads){
      if(Date.parse(t.lastActivityAt) > now - oneDay) today++
      if(t.isPinned) pinned++
    }
    return { total: threads.length, today, pinned }
  },[threads])
  return (
    <div className="glass-panel rounded-2xl p-4 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Статистика</h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-inline rounded-lg p-3 text-center">
          <div className="text-[10px] uppercase text-slate-400 tracking-wide">Тем</div>
          <div className="text-sm font-semibold text-white">{stats.total}</div>
        </div>
        <div className="glass-inline rounded-lg p-3 text-center">
          <div className="text-[10px] uppercase text-slate-400 tracking-wide">Активных 24h</div>
          <div className="text-sm font-semibold text-white">{stats.today}</div>
        </div>
        <div className="glass-inline rounded-lg p-3 text-center">
          <div className="text-[10px] uppercase text-slate-400 tracking-wide">Закреплено</div>
          <div className="text-sm font-semibold text-white">{stats.pinned}</div>
        </div>
      </div>
    </div>
  )
}
