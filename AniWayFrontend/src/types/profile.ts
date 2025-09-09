// Типы для профиля пользователя - обновлены под существующую систему
import { User, Bookmark, ReadingProgress, MangaResponseDTO } from './index';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  role: 'USER' | 'ADMIN' | 'TRANSLATOR';
  isOnline: boolean;
  lastSeen?: Date;
  backgroundImage?: string;
  socialLinks?: SocialLinks;
  favoriteGenres?: string[];
  joinedDate: Date;
  totalReadingTime: number;
  mangaRead: number;
  chaptersRead: number;
  
  // Дополнительные поля из публичного API
  likesGivenCount?: number;
  commentsCount?: number;
}

export interface SocialLinks {
  twitter?: string;
  discord?: string;
  telegram?: string;
  vk?: string;
}

export interface UserProfileProps {
  userId: string;
  isOwnProfile: boolean;
}

// Используем существующие типы из системы
export interface FavoriteManga {
  id: number;
  title: string;
  coverImage: string;
  rating: number;
  manga?: MangaResponseDTO;
}

export interface UserReadingProgress extends ReadingProgress {
  title: string;
  coverImage: string;
  currentChapter: number;
  totalChapters: number;
  lastRead: Date;
}

export interface UserCollection {
  id: string;
  name: string;
  description: string;
  mangaCount: number;
  coverImages: string[];
  isPublic: boolean;
  bookmarks?: Bookmark[];
}

export interface UserReview {
  id: string;
  mangaId: number;
  mangaTitle: string;
  rating: number;
  text: string;
  createdAt: Date;
  likes: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserActivity {
  id: string;
  type: 'read' | 'review' | 'bookmark' | 'achievement';
  description: string;
  timestamp: Date;
  relatedMangaId?: number;
}

export interface Friend {
  id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface Community {
  id: string;
  name: string;
  avatar?: string;
  memberCount: number;
  role: 'member' | 'moderator' | 'admin';
}

// API типы для загрузки данных профиля
export interface ProfileDataResponse {
  user: User;
  bookmarks: Bookmark[];
  readingProgress: ReadingProgress[];
  readingStats?: {
    totalMangaRead: number;
    totalChaptersRead: number;
    totalPagesRead: number;
    favoriteGenres: string[];
    readingStreak: number;
  };
}
