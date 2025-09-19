import React from 'react'
import { FavoriteManga } from '@/types/profile'

interface ProfileShowcaseFavoritesProps {
  favorites: FavoriteManga[]
}

export const ProfileShowcaseFavorites: React.FC<ProfileShowcaseFavoritesProps> = ({ favorites }) => {
  const top = favorites.slice(0, 9)
  return (
  <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">Избранное <span className="text-xs font-normal text-slate-400">{favorites.length}</span></h2>
      {top.length===0 ? (
        <div className="text-sm text-slate-400">Нет избранного</div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {top.map(m => (
            <div key={m.id} className="group relative">
              <div className="aspect-[2/3] w-full overflow-hidden rounded-md ring-1 ring-white/10 bg-black/40">
                <img src={(m.coverImage)} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="mt-1 text-[11px] leading-tight text-slate-300 line-clamp-2 group-hover:text-white transition-colors">{m.title}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )}
