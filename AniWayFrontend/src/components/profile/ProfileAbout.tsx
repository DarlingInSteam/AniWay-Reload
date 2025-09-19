import React, { useState } from 'react'
import { UserProfile } from '@/types/profile'
import { Button } from '@/components/ui/button'
import { Edit2, Save, X } from 'lucide-react'

interface ProfileAboutProps {
  profile: UserProfile
  isOwn: boolean
  onUpdate?: (data: Partial<UserProfile>) => void
}

export const ProfileAbout: React.FC<ProfileAboutProps> = ({ profile, isOwn, onUpdate }) => {
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState(profile.bio || '')
  return (
  <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">О пользователе</h2>
        {isOwn && !editing && (
          <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10" onClick={()=>setEditing(true)}>
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
      </div>
      {editing ? (
        <div className="space-y-3">
          <textarea value={bio} onChange={e=>setBio(e.target.value)} className="w-full min-h-[120px] rounded-md bg-black/30 border border-white/10 text-sm text-white p-3 resize-y focus:outline-none focus:ring-2 focus:ring-primary/40" maxLength={1000} />
          <div className="flex justify-between text-xs text-slate-400">
            <span>{bio.length}/1000</span>
            <div className="flex gap-2">
              <Button size="sm" className="bg-primary/25 hover:bg-primary/35 border border-primary/30" onClick={()=>{onUpdate?.({ bio });setEditing(false)}}>
                <Save className="w-4 h-4 mr-1"/>Сохранить
              </Button>
              <Button size="sm" variant="outline" className="border-white/15 bg-white/5 hover:bg-white/10" onClick={()=>{setBio(profile.bio||'');setEditing(false)}}>
                <X className="w-4 h-4 mr-1"/>Отмена
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-slate-200 whitespace-pre-wrap min-h-[60px]">{bio || (isOwn ? 'Добавьте описание о себе' : 'Нет описания')}</p>
      )}
    </div>
  )
}
