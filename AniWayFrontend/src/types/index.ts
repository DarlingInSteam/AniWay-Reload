// Типы для Manga API
export interface MangaResponseDTO {
  id: number;
  title: string;
  description: string;
  author: string;
  artist: string;
  genre: string;
  status: 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'CANCELLED';
  releaseDate: string;
  coverImageUrl: string;
  totalChapters: number;
  createdAt: string;
  updatedAt: string;
}

export interface MangaCreateDTO {
  title: string;
  description: string;
  author: string;
  artist: string;
  genre: string;
  status: 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'CANCELLED';
  releaseDate: string;
  coverImageUrl: string;
}

// Типы для Chapter API
export interface ChapterDTO {
  id: number;
  mangaId: number;
  chapterNumber: number;
  title?: string;
  publishedDate: string;
  pageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterCreateDTO {
  mangaId: number;
  chapterNumber: number;
  title?: string;
  publishedDate: string;
}

// Типы для Image API
export interface ChapterImageDTO {
  id: number;
  chapterId: number;
  pageNumber: number;
  imageKey: string;
  originalFileName: string;
  contentType: string;
  fileSize: number;
  uploadedAt: string;
}

// Типы для поиска
export interface SearchParams {
  title?: string;
  author?: string;
  genre?: string;
  status?: 'ONGOING' | 'COMPLETED' | 'HIATUS' | 'CANCELLED';
}

// Типы для UI состояний
export interface PaginationState {
  page: number;
  limit: number;
  total: number;
}

export interface ReadingState {
  currentPage: number;
  totalPages: number;
  isFullscreen: boolean;
  readingMode: 'single' | 'double';
}
