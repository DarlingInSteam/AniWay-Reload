import React from 'react'
import { cn } from '@/lib/utils'

interface MangaCardSkeletonProps {
  size?: 'default' | 'compact' | 'large'
}

export const MangaCardSkeleton: React.FC<MangaCardSkeletonProps> = ({ size = 'default' }) => {
  const cardSizes = {
    compact: 'aspect-[3/4]',
    default: 'aspect-[3/4]',
    large: 'aspect-[3/4]'
  }

  return (
    <div className="flex flex-col space-y-2 md:space-y-3 w-full animate-fade-in">
      <div className={cn('relative overflow-hidden rounded-lg md:rounded-xl bg-white/5 skeleton-shimmer', cardSizes[size])}>
        <div className="absolute top-2 left-2 h-5 w-16 rounded-full bg-white/10" />
        <div className="absolute bottom-2 right-2 h-5 w-14 rounded bg-white/10" />
      </div>
      <div className="px-1 space-y-2">
        <div className="h-4 bg-white/10 rounded w-11/12" />
        <div className="flex items-center justify-between h-3">
          <div className="h-3 bg-white/10 rounded w-1/2" />
          <div className="h-3 bg-white/10 rounded w-8" />
        </div>
        <div className="flex items-center justify-between h-3">
          <div className="h-3 bg-white/10 rounded w-10" />
          <div className="h-3 bg-white/10 rounded w-12" />
        </div>
      </div>
    </div>
  )
}

export default MangaCardSkeleton
