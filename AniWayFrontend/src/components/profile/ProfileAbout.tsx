import React, { useState } from 'react'
import { UserProfile } from '@/types/profile'
import { Button } from '@/components/ui/button'
import { Edit2, Save, X } from 'lucide-react'
import { ProfilePanel } from './ProfilePanel'
import { MarkdownEditor } from '@/components/markdown/MarkdownEditor'
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer'

interface ProfileAboutProps {
  profile: UserProfile
  isOwn: boolean
  onUpdate?: (data: Partial<UserProfile>) => void
}

export const ProfileAbout: React.FC<ProfileAboutProps> = ({ profile, isOwn, onUpdate }) => {
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState(profile.bio || '')
  return (
  <ProfilePanel title="О пользователе" actions={isOwn && !editing ? (
    <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-white/10" onClick={()=>setEditing(true)}>
      <Edit2 className="w-4 h-4" />
    </Button>
  ) : undefined}>
      {editing ? (
        <div className="space-y-3">
          <MarkdownEditor value={bio} onChange={setBio} placeholder="Добавьте описание о себе (Markdown поддерживается)" minRows={6} maxRows={14} />
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
        <div className="text-sm leading-relaxed text-slate-200 markdown-body min-h-[60px]">
          {bio ? <MarkdownRenderer value={bio} /> : (isOwn ? 'Добавьте описание о себе' : 'Нет описания')}
        </div>
      )}
    </ProfilePanel>
  )
}
