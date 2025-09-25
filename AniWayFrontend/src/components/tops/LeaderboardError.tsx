interface LeaderboardErrorProps {
  message?: string
  onRetry?: () => void
}

export function LeaderboardError({ message = 'Не удалось загрузить данные', onRetry }: LeaderboardErrorProps) {
  return (
    <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center justify-between gap-4">
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1 rounded-md bg-destructive text-white text-xs font-medium hover:brightness-110 transition"
        >
          Повторить
        </button>
      )}
    </div>
  )
}
