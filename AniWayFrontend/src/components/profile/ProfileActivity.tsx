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

          const desc = a.description || ''
          const ratingMatch = desc.match(/(\d+(?:[.,]\d+)?)\s*\/\s*10/)
          const rating = ratingMatch ? ratingMatch[1].replace(',', '.') : null

          const formatChapterCode = (raw?: number | null): string | null => {
            if (raw == null) return null
            const intPart = Math.floor(raw)
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

          const formattedChapter = formatChapterCode(a.chapterNumber)
          const mangaTitle = a.mangaTitle

          const renderDescription = () => {
            if (a.type === 'read') {
              return (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-slate-300">Прочитал</span>
                  {mangaTitle && (
                    <Link to={a.relatedMangaId ? `/manga/${a.relatedMangaId}` : '#'} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                      {mangaTitle}
                    </Link>
                  )}
                  {formattedChapter && (
                    <>
                      <span className="text-slate-500">•</span>
                      {a.chapterId ? (
                        <Link to={`/reader/${a.chapterId}`} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">{formattedChapter}</Link>
                      ) : (
                        <span className="text-blue-400 font-medium">{formattedChapter}</span>
                      )}
                    </>
                  )}
                </div>
              )
            }
            if (a.type === 'review') {
              return (
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-slate-300">Отзыв</span>
                  {rating && <span className="text-yellow-400 font-semibold">{rating}/10</span>}
                  {mangaTitle && (
                    <>
                      <span className="text-slate-500">на</span>
                      <Link to={a.relatedMangaId ? `/manga/${a.relatedMangaId}` : '#'} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                        {mangaTitle}
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
