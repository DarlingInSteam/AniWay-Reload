import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { TopsHero } from '@/features/tops/components/TopsHero'
import { TopsTabNav } from '@/features/tops/components/TopsTabNav'
import { TopsSidebar } from '@/features/tops/components/TopsSidebar'
import {
  UsersMetricFilter,
  ReviewsFilter,
  RangeFilter,
  WallRangeFilter,
  rangeTitles
} from '@/features/tops/components/TopsFilters'
import { GlassPanel } from '@/features/tops/components/primitives'
import { UsersSection } from '@/features/tops/components/sections/UsersSection'
import { ReviewsSection } from '@/features/tops/components/sections/ReviewsSection'
import { ThreadsSection } from '@/features/tops/components/sections/ThreadsSection'
import { CommentsSection } from '@/features/tops/components/sections/CommentsSection'
import { WallSection } from '@/features/tops/components/sections/WallSection'
import type { FormatterBundle } from '@/features/tops/components/sections/types'
import {
  useTopsData,
  integerFormatter,
  compactFormatter
} from '@/features/tops/hooks/useTopsData'
import { TOPS_TAB_META, TOPS_TABS } from '@/features/tops/constants'
import type {
  TopsTabKey,
  UserMetric,
  RangeOptionValue,
  WallRangeOptionValue
} from '@/features/tops/types'

export function TopsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState<TopsTabKey>(() => {
    const queryTab = (searchParams.get('tab') || '').toLowerCase() as TopsTabKey
    return TOPS_TABS.includes(queryTab) ? queryTab : 'users'
  })

  const [userMetric, setUserMetric] = useState<UserMetric>('readers')
  const [threadsRange, setThreadsRange] = useState<RangeOptionValue>('all')
  const [commentsRange, setCommentsRange] = useState<RangeOptionValue>('all')
  const [wallRange, setWallRange] = useState<WallRangeOptionValue>('all')
  const [reviewsDays, setReviewsDays] = useState<number>(7)

  useEffect(() => {
    const current = (searchParams.get('tab') || '').toLowerCase()
    if (current !== activeTab) {
      const nextParams = new URLSearchParams(searchParams.toString())
      nextParams.set('tab', activeTab)
      setSearchParams(nextParams, { replace: true })
    }
  }, [activeTab, searchParams, setSearchParams])

  const topsData = useTopsData({
    userMetric,
    reviewsDays,
    threadsRange,
    commentsRange,
    wallRange
  })

  const formatter = useMemo<FormatterBundle>(
    () => ({ integer: integerFormatter, compact: compactFormatter }),
    []
  )

  const activeMeta = TOPS_TAB_META[activeTab]

  const filterCard = (() => {
    switch (activeTab) {
      case 'users':
        return <UsersMetricFilter value={userMetric} onChange={setUserMetric} />
      case 'reviews':
        return <ReviewsFilter value={reviewsDays} onChange={setReviewsDays} />
      case 'threads':
        return (
          <RangeFilter
            value={threadsRange}
            onChange={setThreadsRange}
            icon={rangeTitles.threads.icon}
            title={rangeTitles.threads.title}
            description={rangeTitles.threads.description}
          />
        )
      case 'comments':
        return (
          <RangeFilter
            value={commentsRange}
            onChange={setCommentsRange}
            icon={rangeTitles.comments.icon}
            title={rangeTitles.comments.title}
            description={rangeTitles.comments.description}
          />
        )
      case 'wall':
        return <WallRangeFilter value={wallRange} onChange={setWallRange} />
      default:
        return null
    }
  })()

  const navigateTo = (path: string) => navigate(path)
  const navigateToProfile = (id: number) => navigate(`/profile/${id}#from-tops`)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-8 px-4 py-8">
        <TopsHero summaryCards={topsData.summaryCards} />

        <TopsTabNav
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab)}
        />

        <div className="grid gap-6 lg:grid-cols-[320px,minmax(0,1fr)] xl:grid-cols-[360px,minmax(0,1fr)]">
          <TopsSidebar meta={activeMeta} filterCard={filterCard} />

          <div className="space-y-6">
            {activeTab === 'users' && (
              <GlassPanel className="border-white/12 bg-background/70 p-6">
                <UsersSection
                  query={topsData.usersQuery}
                  userMetric={userMetric}
                  userLevelMap={topsData.userLevelMap}
                  formatter={formatter}
                  onNavigateToProfile={navigateToProfile}
                />
              </GlassPanel>
            )}

            {activeTab === 'reviews' && (
              <GlassPanel className="border-white/12 bg-background/70 p-6">
                <ReviewsSection
                  query={topsData.reviewsQuery}
                  formatter={formatter}
                  reviewUserMap={topsData.reviewUserMap}
                  reviewMangaMap={topsData.reviewMangaMap}
                  onNavigate={navigateTo}
                />
              </GlassPanel>
            )}

            {activeTab === 'threads' && (
              <GlassPanel className="border-white/12 bg-background/70 p-6">
                <ThreadsSection
                  query={topsData.threadsQuery}
                  formatter={formatter}
                  threadAuthorMap={topsData.threadAuthorMap}
                  onNavigate={navigateTo}
                />
              </GlassPanel>
            )}

            {activeTab === 'comments' && (
              <GlassPanel className="border-white/12 bg-background/70 p-6">
                <CommentsSection
                  query={topsData.commentsQuery}
                  formatter={formatter}
                  commentAuthorMap={topsData.commentAuthorMap}
                  onNavigate={navigateTo}
                />
              </GlassPanel>
            )}

            {activeTab === 'wall' && (
              <GlassPanel className="border-white/12 bg-background/70 p-6">
                <WallSection
                  query={topsData.wallPostsQuery}
                  formatter={formatter}
                  wallAuthorMap={topsData.wallAuthorMap}
                  wallMangaMap={topsData.wallMangaMap}
                  onNavigate={navigateTo}
                />
              </GlassPanel>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TopsPage

