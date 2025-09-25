import React from 'react'
import { ForumThread } from '@/types/forum'
import { Link } from 'react-router-dom'
import { Pin } from 'lucide-react'

interface PinnedThreadsProps { threads: ForumThread[] }

export function PinnedThreads({ threads }: PinnedThreadsProps){
  if(!threads.length) return null
  return (
    <div className="glass-panel rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400"><Pin className="h-3 w-3"/> Закреплённые</div>
      <div className="grid gap-3 md:grid-cols-2">
        {threads.map(t=> (
          <Link key={t.id} to={`/forum/thread/${t.id}`} className="group relative rounded-xl bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors">
            <div className="text-sm font-medium text-white line-clamp-2 group-hover:text-white/90">{t.title}</div>
            <div className="mt-1 flex items-center gap-4 text-[11px] text-white/50">
              <span>{t.repliesCount} ответов</span>
              <span>{t.viewsCount} просмотров</span>
            </div>
            <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/10 group-hover:ring-white/20" />
          </Link>
        ))}
      </div>
    </div>
  )
}
