import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { UserActivity } from '@/types/profile'
import { Clock, BookOpen, Bookmark as BookmarkIcon, Star, Award } from 'lucide-react'
import { ProfilePanel } from './ProfilePanel'

interface ProfileActivityProps { activities: UserActivity[] }

function relativeTime(ts: Date) {
  const diff = Date.now() - ts.getTime()
  const m = Math.floor(diff/60000)
  if (m < 1) return 'только что'
  if (m < 60) return `${m} мин назад`
  const h = Math.floor(m/60)
  if (h < 24) return `${h} ч назад`
  const d = Math.floor(h/24)
  if (d < 7) return `${d} дн назад`
  const w = Math.floor(d/7)
  if (w < 4) return `${w} нед назад`
  const mon = Math.floor(d/30)
  if (mon < 12) return `${mon} мес назад`
  const y = Math.floor(d/365)
  return `${y} г назад`
}

const iconByType: Record<string, JSX.Element> = {
  read: <BookOpen className="w-3.5 h-3.5" />,
  review: <Star className="w-3.5 h-3.5" />,
  bookmark: <BookmarkIcon className="w-3.5 h-3.5" />,
  achievement: <Award className="w-3.5 h-3.5" />
}

export const ProfileActivity: React.FC<ProfileActivityProps> = ({ activities }) => {
  const INITIAL = 4
  const [expanded, setExpanded] = useState(false)
  const safeActivities = Array.isArray(activities) ? activities : []

  const visible = useMemo(() => {
    if (expanded) return safeActivities
    return safeActivities.slice(0, INITIAL)
  }, [expanded, safeActivities])

  if (safeActivities.length === 0) {
    return (
      <ProfilePanel title="Активность">
        <div className="text-sm text-slate-400">Пока нет активности</div>
      </ProfilePanel>
    )
  }

  return (
    <ProfilePanel title="Активность">
      <ul className="space-y-3">
        {visible.map(a => {
          const Icon = iconByType[a.type] || <Clock className="w-3.5 h-3.5" />

          // Basic parsing for backend message variants
          const desc = a.description || ''

          const ratingMatch = desc.match(/(\d+(?:[.,]\d+)?)\s*\/\s*10/)
          const rating = ratingMatch ? ratingMatch[1].replace(',', '.') : null

          // Chapter number normalization: handles patterns like "Прочитана глава 1006.0" or "Прочитал главу 1006.0"
          let rawChapter: number | null = null
          const chapterMatch = desc.match(/глава\s+(\d+(?:\.\d+)?)/i)
          if (chapterMatch) {
            rawChapter = parseFloat(chapterMatch[1])
          }
          const formatChapterCode = (raw?: number | null): string | null => {
            if (!raw && raw !== 0) return null
            const intPart = Math.floor(raw as number)
            if (Number.isNaN(intPart) || intPart <= 0) return null
            const digits = String(intPart)
            if (digits.length > 3) {
              const volStr = digits.slice(0, -3)
              const chapStrRaw = digits.slice(-3)
              const chapterNumber = chapStrRaw.replace(/^0+/, '') || '0'
              const volumeNumber = parseInt(volStr, 10)
              return `Том ${volumeNumber} Глава ${chapterNumber}`
            }
            return `Глава ${intPart}`
          }
          const formattedChapter = formatChapterCode(rawChapter || undefined)

          // Attempt to extract quoted manga title from message e.g. ...манги 'Title' or "Title"
          let extractedTitle: string | null = null
            ;(() => {
              const q = desc.match(/манги?\s+["'“”«»]?([^"'“”«»]+)["'“”«»]?/i)
              if (q && q[1]) extractedTitle = q[1].trim()
            })()

          // Decide rendering per type
          const renderDescription = () => {
            if (a.type === 'read') {
              return (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-slate-300">Прочитал</span>
                  {extractedTitle && (
                    <Link to={a.relatedMangaId ? `/manga/${a.relatedMangaId}` : '#'} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                      {extractedTitle}
                    </Link>
                  )}
                  {formattedChapter && (
                    <>
                      <span className="text-slate-500">•</span>
                      <span className="text-blue-400 font-medium">{formattedChapter}</span>
                    </>
                  )}
                  {!formattedChapter && rawChapter && (
                    <span className="text-slate-400">Глава {rawChapter}</span>
                  )}
                </div>
              )
            }
            if (a.type === 'review') {
              return (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-slate-300">Отзыв</span>
                  {rating && <span className="text-yellow-400 font-semibold">{rating}/10</span>}
                  {extractedTitle && (
                    <>
                      <span className="text-slate-500">на</span>
                      <Link to={a.relatedMangaId ? `/manga/${a.relatedMangaId}` : '#'} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                        {extractedTitle}
                      </Link>
                    </>
                  )}
                </div>
              )
            }
            return <div>{desc}</div>
          }

          return (
            <li key={a.id} className="flex items-start gap-3 text-sm">
              <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center text-primary shrink-0">
                {Icon}
              </div>
              <div className="flex-1 text-slate-200">
                {renderDescription()}
                <div className="text-[11px] tracking-wide text-slate-500 mt-0.5">{relativeTime(a.timestamp)}</div>
              </div>
            </li>
          )
        })}
      </ul>
      {safeActivities.length > INITIAL && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="mt-4 w-full text-center text-xs font-medium tracking-wide text-slate-300 hover:text-white px-3 py-2 rounded-md bg-white/5 border border-white/10 transition"
        >
          {expanded ? 'Свернуть' : `Показать ещё (${safeActivities.length - INITIAL})`}
        </button>
      )}
    </ProfilePanel>
  )
}
