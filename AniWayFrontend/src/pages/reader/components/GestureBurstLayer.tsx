import { Heart } from 'lucide-react'

interface GestureBurst {
  id: number
  x: number
  y: number
}

interface GestureBurstLayerProps {
  bursts: GestureBurst[]
}

export const GestureBurstLayer = ({ bursts }: GestureBurstLayerProps) => (
  <>
    {bursts.map(burst => (
      <div
        key={burst.id}
        style={{
          position: 'fixed',
          left: burst.x - 40,
          top: burst.y - 40,
          pointerEvents: 'none',
          zIndex: 60,
          animation: 'heart-pop 1.2s ease-out forwards'
        }}
        className="select-none"
      >
        <Heart className="w-20 h-20 text-red-500/80 fill-red-500/80 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
      </div>
    ))}
  </>
)
