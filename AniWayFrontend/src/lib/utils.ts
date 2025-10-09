import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateString))
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'только что'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} мин назад`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ч назад`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} дн назад`

  return formatDate(dateString)
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'ONGOING':
      return 'text-green-600 bg-green-100'
    case 'COMPLETED':
      return 'text-blue-600 bg-blue-100'
    case 'ANNOUNCED':
      return 'text-purple-600 bg-purple-100'
    case 'HIATUS':
      return 'text-yellow-600 bg-yellow-100'
    case 'CANCELLED':
      return 'text-red-600 bg-red-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

export function getStatusText(status: string): string {
  switch (status) {
    case 'ONGOING':
      return 'Онгоинг'
    case 'COMPLETED':
      return 'Завершён'
    case 'ANNOUNCED':
      return 'Анонс'
    case 'HIATUS':
      return 'Приостановлен'
    case 'CANCELLED':
      return 'Выпуск прекращён'
    default:
      return status
  }
}

export function getTypeText(type: string): string {
  switch (type) {
    case 'MANGA':
      return 'Манга'
    case 'MANHWA':
      return 'Манхва'
    case 'MANHUA':
      return 'Маньхуа'
    case 'WESTERN_COMIC':
      return 'Комикс'
    case 'RUSSIAN_COMIC':
      return 'Руманга'
    case 'OEL':
      return 'OEL-манга'
    default:
      return type
  }
}
