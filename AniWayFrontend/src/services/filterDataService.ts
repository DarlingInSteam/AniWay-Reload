// Типы для жанров и тегов
export interface Genre {
  id: number;
  name: string;
  description?: string;
  slug: string;
  mangaCount: number;
}

export interface Tag {
  id: number;
  name: string;
  description?: string;
  slug: string;
  color: string;
  mangaCount: number;
  popularityScore: number;
  isActive: boolean;
}

export interface GenreStats {
  totalGenres: number;
  activeGenres: number;
}

export interface TagStats {
  totalTags: number;
  activeTags: number;
  tagsWithMangas: number;
}

// API service для жанров и тегов
type EnvWithOptionalBaseUrl = ImportMeta & {
  env?: {
    VITE_API_BASE_URL?: string;
  };
};

let activeGenresCache: Genre[] | null = null;
let activeGenresPromise: Promise<Genre[]> | null = null;
let activeTagsCache: Tag[] | null = null;
let activeTagsPromise: Promise<Tag[]> | null = null;

const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes
const SESSION_KEY_GENRES = 'aw_active_genres_v1';
const SESSION_KEY_TAGS = 'aw_active_tags_v1';

type CachedPayload<T> = { data: T; expires: number };

const readSessionCache = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload<T> | null;
    if (!parsed || typeof parsed.expires !== 'number') return null;
    if (parsed.expires < Date.now()) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data ?? null;
  } catch (error) {
    console.warn('Failed to read filter cache', error);
    return null;
  }
};

const writeSessionCache = <T>(key: string, data: T) => {
  if (typeof window === 'undefined') return;
  try {
    const payload: CachedPayload<T> = { data, expires: Date.now() + CACHE_TTL_MS };
    window.sessionStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to persist filter cache', error);
  }
};

const invalidateSessionCache = (key: string) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to clear filter cache', error);
  }
};

export class FilterDataService {
  private static readonly API_BASE_URL = (() => {
    const configured = (import.meta as EnvWithOptionalBaseUrl).env?.VITE_API_BASE_URL;
    if (configured) {
      return configured;
    }
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  })();

  /**
   * Получение активных жанров
   */
  static async getActiveGenres(force = false): Promise<Genre[]> {
    if (!force) {
      if (activeGenresCache) {
        return activeGenresCache;
      }
      const fromSession = readSessionCache<Genre[]>(SESSION_KEY_GENRES);
      if (fromSession) {
        activeGenresCache = fromSession;
        return fromSession;
      }
      if (activeGenresPromise) {
        return activeGenresPromise;
      }
    }

    activeGenresPromise = (async () => {
      try {
        const response = await fetch(`${this.API_BASE_URL}/api/genres/active`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Genre[] = await response.json();
        activeGenresCache = data;
        writeSessionCache(SESSION_KEY_GENRES, data);
        return data;
      } catch (error) {
        console.error('Ошибка при получении жанров:', error);
        activeGenresCache = null;
        throw error;
      } finally {
        activeGenresPromise = null;
      }
    })();

    try {
      return await activeGenresPromise;
    } catch {
      return [];
    }
  }

  static invalidateActiveGenres() {
    activeGenresCache = null;
    invalidateSessionCache(SESSION_KEY_GENRES);
  }

  /**
   * Получение активных тегов с мангами
   */
  static async getActiveTags(force = false): Promise<Tag[]> {
    if (!force) {
      if (activeTagsCache) {
        return activeTagsCache;
      }
      const fromSession = readSessionCache<Tag[]>(SESSION_KEY_TAGS);
      if (fromSession) {
        activeTagsCache = fromSession;
        return fromSession;
      }
      if (activeTagsPromise) {
        return activeTagsPromise;
      }
    }

    activeTagsPromise = (async () => {
      try {
        const response = await fetch(`${this.API_BASE_URL}/api/tags/active/with-mangas`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: Tag[] = await response.json();
        activeTagsCache = data;
        writeSessionCache(SESSION_KEY_TAGS, data);
        return data;
      } catch (error) {
        console.error('Ошибка при получении тегов:', error);
        activeTagsCache = null;
        throw error;
      } finally {
        activeTagsPromise = null;
      }
    })();

    try {
      return await activeTagsPromise;
    } catch {
      return [];
    }
  }

  static invalidateActiveTags() {
    activeTagsCache = null;
    invalidateSessionCache(SESSION_KEY_TAGS);
  }

  /**
   * Получение популярных жанров
   */
  static async getPopularGenres(limit: number = 20): Promise<Genre[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/genres/popular?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении популярных жанров:', error);
      return [];
    }
  }

  /**
   * Получение популярных тегов
   */
  static async getPopularTags(limit: number = 30): Promise<Tag[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/tags/popular?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении популярных тегов:', error);
      return [];
    }
  }

  /**
   * Поиск жанров
   */
  static async searchGenres(query: string): Promise<Genre[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/genres/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка при поиске жанров:', error);
      return [];
    }
  }

  /**
   * Поиск тегов
   */
  static async searchTags(query: string): Promise<Tag[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/tags/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка при поиске тегов:', error);
      return [];
    }
  }

  /**
   * Автодополнение жанров
   */
  static async autocompleteGenres(query: string, limit: number = 10): Promise<Genre[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/genres/autocomplete?query=${encodeURIComponent(query)}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка при автодополнении жанров:', error);
      return [];
    }
  }

  /**
   * Автодополнение тегов
   */
  static async autocompleteTags(query: string, limit: number = 15): Promise<Tag[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/tags/autocomplete?query=${encodeURIComponent(query)}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка при автодополнении тегов:', error);
      return [];
    }
  }

  /**
   * Получение статистики жанров
   */
  static async getGenreStats(): Promise<GenreStats | null> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/genres/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении статистики жанров:', error);
      return null;
    }
  }

  /**
   * Получение статистики тегов
   */
  static async getTagStats(): Promise<TagStats | null> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/tags/stats`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении статистики тегов:', error);
      return null;
    }
  }
}