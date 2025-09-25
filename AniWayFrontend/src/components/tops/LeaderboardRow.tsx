import { ReactNode } from 'react'

interface LeaderboardRowProps {
  rank: number
  avatar?: ReactNode
  primary: ReactNode
  secondary?: ReactNode
  metricValue?: ReactNode
  onClick?: () => void
}

export function LeaderboardRow({ rank, avatar, primary, secondary, metricValue, onClick }: LeaderboardRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-card/30 hover:bg-card/50 transition-colors border border-border/10 hover:border-border/30 text-left"
    >
      <div className="w-8 text-sm font-semibold text-muted-foreground tabular-nums flex justify-center">{rank}</div>
      <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center text-white flex-shrink-0">
        {avatar}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{primary}</div>
        {secondary && <div className="text-xs text-muted-foreground truncate">{secondary}</div>}
      </div>
      {metricValue && (
        <div className="text-sm font-mono font-semibold text-primary/90 ml-2 tabular-nums">
          {metricValue}
        </div>
      )}
    </button>
  )
}
