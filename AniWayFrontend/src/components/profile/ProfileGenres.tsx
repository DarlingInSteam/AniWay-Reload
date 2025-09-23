import React from 'react'
import { UserProfile } from '@/types/profile'
import { ProfilePanel } from './ProfilePanel'

interface ProfileGenresProps { profile: UserProfile }

export const ProfileGenres: React.FC<ProfileGenresProps> = ({ profile }) => {
  const genres = profile.favoriteGenres || []
  return (
    <ProfilePanel title="Любимые жанры">
      {genres.length === 0 ? (
        <div className="text-sm text-slate-400">Жанры появятся автоматически на основе чтения</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {genres.map(g => <span key={g} className="px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium border border-primary/25">{g}</span>)}
        </div>
      )}
    </ProfilePanel>
  )
}
