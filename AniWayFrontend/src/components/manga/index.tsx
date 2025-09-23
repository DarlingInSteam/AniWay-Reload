import React from 'react'
import { MangaResponseDTO } from '@/types'
import { MangaCard } from './MangaCard'
import { MangaTooltip } from './MangaTooltip'

interface MangaCardWithTooltipProps {
  manga: MangaResponseDTO
  size?: 'default' | 'compact' | 'large'
  showMetadata?: boolean
  enableTooltip?: boolean
}

export function MangaCardWithTooltip({
  manga,
  size = 'default',
  showMetadata = true,
  enableTooltip = true
}: MangaCardWithTooltipProps) {
  if (!manga) {
    return null;
  }

  if (!enableTooltip) {
    return <MangaCard manga={manga} size={size} showMetadata={showMetadata} />
  }

  return (
    <MangaTooltip manga={manga}>
      <MangaCard manga={manga} size={size} showMetadata={showMetadata} />
    </MangaTooltip>
  )
}

// Экспортируем оба компонента для гибкости использования
export { MangaCard } from './MangaCard'
export { MangaTooltip } from './MangaTooltip'
