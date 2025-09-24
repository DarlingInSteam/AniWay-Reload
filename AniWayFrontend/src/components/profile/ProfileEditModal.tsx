import React, { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { MarkdownEditor } from '@/components/markdown/MarkdownEditor'
import { profileService } from '@/services/profileService'
import { UserProfile } from '@/types/profile'

interface ProfileEditModalProps {
  profile: UserProfile
  open: boolean
  onOpenChange: (v: boolean) => void
  onUpdated: (data: Partial<UserProfile>) => void
}

const countries = ['Россия','США','Япония','Корея','Украина','Германия','Франция','Канада','Китай','Другие']

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({ profile, open, onOpenChange, onUpdated }) => {
  const [tab, setTab] = useState('main')
  const [displayName, setDisplayName] = useState(profile.displayName || '')
  // country field not in current UserProfile type; placeholder local state (persist later if backend supports)
  const [country, setCountry] = useState('')
  const [bio, setBio] = useState(profile.bio || '')
  const [saving, setSaving] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement|null>(null)
  const [avatarMsg,setAvatarMsg]=useState<string|undefined>()

  const submitMain = async () => {
    setSaving(true)
    try {
  await profileService.updateProfileSettings({ displayName, bio })
  onUpdated({ displayName, bio })
      onOpenChange(false)
    } catch (e:any) { /* handle error toast later */ } finally { setSaving(false) }
  }

  const handlePickAvatar = () => fileRef.current?.click()
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if(!f) return;
    if(f.size>5*1024*1024){ setAvatarMsg('>5MB'); return }
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
    setAvatarMsg(undefined)
  }
  const uploadAvatar = async () => {
    if(!avatarFile) return
    setSaving(true)
    try {
      const res = await profileService.uploadAvatar(avatarFile)
      if(res.success){
        onUpdated({ avatar: `${res.avatarUrl}${res.avatarUrl.includes('?')?'&':'?'}v=${Date.now()}` })
        setAvatarMsg('Сохранено')
      } else setAvatarMsg(res.message||'Ошибка')
    } catch(e:any){ setAvatarMsg('Сбой') } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-manga-black/95 border border-white/10 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-white text-lg">Редактирование профиля</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="grid grid-cols-2 bg-white/5">
            <TabsTrigger value="main">Основные</TabsTrigger>
            <TabsTrigger value="avatar">Аватар</TabsTrigger>
          </TabsList>
          <TabsContent value="main" className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400">Имя профиля</label>
              <input value={displayName} onChange={e=>setDisplayName(e.target.value)} className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40" maxLength={40} />
            </div>
            <div className="opacity-60 pointer-events-none">
              <label className="text-xs uppercase tracking-wide text-slate-400">Страна (скоро)</label>
              <select disabled value={country} onChange={e=>setCountry(e.target.value)} className="mt-1 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white">
                <option value="">— Не указано —</option>
                {countries.map(c=> <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-slate-400">О себе</label>
              <MarkdownEditor value={bio} onChange={setBio} minRows={6} maxRows={14} placeholder="Расскажите о себе..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={()=> onOpenChange(false)} className="border-white/15 bg-white/5 hover:bg-white/10">Отмена</Button>
              <Button size="sm" disabled={saving} onClick={submitMain} className="bg-primary hover:bg-primary/90 disabled:opacity-50">{saving? 'Сохранение...' : 'Сохранить'}</Button>
            </div>
          </TabsContent>
          <TabsContent value="avatar" className="space-y-4">
            <input ref={fileRef} onChange={handleAvatarChange} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" />
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-xl overflow-hidden ring-2 ring-white/10 bg-white/5 flex items-center justify-center">
                {avatarPreview ? <img src={avatarPreview} alt="preview" className="object-cover w-full h-full" /> : (
                  profile.avatar ? <img src={profile.avatar} alt="avatar" className="object-cover w-full h-full" /> : <span className="text-slate-500 text-xs">Нет изображения</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-white/15 bg-white/5 hover:bg-white/10" onClick={handlePickAvatar}>Выбрать</Button>
                <Button size="sm" disabled={!avatarFile || saving} onClick={uploadAvatar} className="bg-primary hover:bg-primary/90 disabled:opacity-50">{saving? 'Загрузка...' : 'Загрузить'}</Button>
              </div>
              {avatarMsg && <div className="text-xs text-slate-400">{avatarMsg}</div>}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
