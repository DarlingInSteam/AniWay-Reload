export function formatDistanceToNow(date: Date | string, options?: { addSuffix?: boolean; locale?: any }): string {
  // Если передана строка, парсим её как UTC время
  let dateObj: Date
  if (typeof date === 'string') {
    // Если строка не содержит информацию о часовом поясе, добавляем 'Z' для UTC
    const dateStr = date.includes('Z') || date.includes('+') || date.includes('-') ? date : date + 'Z'
    dateObj = new Date(dateStr)
  } else {
    dateObj = date
  }
  
  const now = new Date()
  const diff = now.getTime() - dateObj.getTime()
  
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)

  const addSuffix = options?.addSuffix || false
  const suffix = addSuffix ? ' назад' : ''

  if (years > 0) {
    return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}${suffix}`
  }
  if (months > 0) {
    return `${months} ${months === 1 ? 'месяц' : months < 5 ? 'месяца' : 'месяцев'}${suffix}`
  }
  if (days > 0) {
    return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'}${suffix}`
  }
  if (hours > 0) {
    return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'}${suffix}`
  }
  if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? 'минуту' : minutes < 5 ? 'минуты' : 'минут'}${suffix}`
  }
  
  return `несколько секунд${suffix}`
}

export const ru = {} // Заглушка для локали
