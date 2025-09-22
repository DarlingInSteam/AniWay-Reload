import { MangaResponseDTO } from '@/types'

export interface MangaBadges {
  isTrending: boolean
  isLicensed: boolean
}

export function computeMangaBadges(manga: MangaResponseDTO, averageRating?: number): MangaBadges {
  const isTrending = (manga.views ?? 0) > 100 && (averageRating ?? 0) >= 7
  const isLicensed = !!manga.isLicensed
  return { isTrending, isLicensed }
}
