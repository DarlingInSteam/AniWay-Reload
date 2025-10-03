import { Users, MessageSquare, Hash, Quote, Sparkles } from 'lucide-react'

import type { RangeOptionValue, SegmentedOption, TopsTabKey, TopsTabMeta, UserMetric, WallRangeOptionValue } from './types'

export const TOPS_TABS: TopsTabKey[] = ['users', 'reviews', 'threads', 'comments', 'wall']

export const USER_METRIC_OPTIONS: Array<{ label: string; value: UserMetric; hint: string }> = [
  { label: 'Читатели', value: 'readers', hint: 'Количество прочитанных глав' },
  { label: 'Лайки', value: 'likes', hint: 'Поставленные реакции' },
  { label: 'Комментарии', value: 'comments', hint: 'Активность в обсуждениях' },
  { label: 'Уровень', value: 'level', hint: 'Уровень и набранный опыт' }
]

export const RANGE_OPTIONS: Array<{ label: string; value: RangeOptionValue }> = [
  { label: 'За всё время', value: 'all' },
  { label: '30 дней', value: '30' },
  { label: '7 дней', value: '7' }
]

export const WALL_RANGE_OPTIONS: Array<{ label: string; value: WallRangeOptionValue }> = [
  { label: 'Все время', value: 'all' },
  { label: '30 дней', value: '30' },
  { label: '7 дней', value: '7' },
  { label: 'Сегодня', value: 'today' }
]

export const REVIEW_RANGE_OPTIONS: SegmentedOption[] = [
  { label: '7 дней', value: '7' },
  { label: '30 дней', value: '30' },
  { label: '90 дней', value: '90' }
]

export const TOPS_TAB_META: Record<TopsTabKey, TopsTabMeta> = {
  users: {
    label: 'Пользователи',
    description: 'Самые активные читатели и комментаторы за выбранный период.',
    hint: 'Откройте профиль участника, чтобы увидеть подробную статистику.',
    icon: Users
  },
  reviews: {
    label: 'Обзоры',
    description: 'Рецензии и обзоры, которые вызывают наибольший отклик.',
    hint: 'Карточка покажет автора, мангу и trust — переходите к обсуждению.',
    icon: Quote
  },
  threads: {
    label: 'Темы форума',
    description: 'Обсуждения, которые собирают ответы и просмотры.',
    hint: 'Сразу переходите к треду, чтобы поддержать разговор.',
    icon: Hash
  },
  comments: {
    label: 'Комментарии',
    description: 'Реплики с наибольшим доверием и реакциями.',
    hint: 'Trust и реакции помогают оценить настрой обсуждения.',
    icon: MessageSquare
  },
  wall: {
    label: 'Стена',
    description: 'Посты сообщества и персональные рекомендации.',
    hint: 'Ссылки и вложения ведут к манге и профилям.',
    icon: Sparkles
  }
}
