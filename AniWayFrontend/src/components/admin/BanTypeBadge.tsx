import { Badge } from '@/components/ui/badge'

export function BanTypeBadge({ banType }: { banType?: 'PERM' | 'TEMP' | 'SHADOW' | null }) {
  if (!banType) return null
  switch (banType) {
    case 'PERM':
      return <Badge variant="destructive" className="text-[10px]">PERM</Badge>
    case 'TEMP':
      return <Badge variant="secondary" className="text-[10px] bg-amber-600/30 border-amber-400/40">TEMP</Badge>
    case 'SHADOW':
      return <Badge variant="outline" className="text-[10px] border-dashed opacity-70">SHADOW</Badge>
    default:
      return null
  }
}
