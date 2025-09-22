import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

export function AvatarMini({ avatar, name, size=24 }: { avatar?: string|null; name: string; size?: number }) {
  const initials = (name||'').split(/\s+/).slice(0,2).map(p=> p[0]).join('').toUpperCase() || 'U'
  return (
    <Avatar className="border border-white/10 bg-white/5" style={{ width: size, height: size, minWidth: size }}>
  {avatar ? <AvatarImage src={avatar} alt={name} className="object-cover" loading="lazy" /> : <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>}
    </Avatar>
  )
}
