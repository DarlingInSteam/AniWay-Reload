import React from 'react'
import { UserProfile } from '@/types/profile'

interface ProfileGenresProps { profile: UserProfile }

export const ProfileGenres: React.FC<ProfileGenresProps> = ({ profile }) => {
  const genres = profile.favoriteGenres || []
  return (
  <div className="rounded-2xl bg-[#1a1d22] border border-white/10 p-5 space-y-4">
      <h2 className="text-lg font-semibold text-white">Любимые жанры</h2>
      {genres.length === 0 ? (
        <div className="text-sm text-slate-400">Жанры появятся автоматически на основе чтения</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {genres.map(g => <span key={g} className="px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium border border-primary/25">{g}</span>)}
        </div>
      )}
    </div>
  )
}
