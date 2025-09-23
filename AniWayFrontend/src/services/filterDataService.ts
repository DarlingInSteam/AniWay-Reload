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
export class FilterDataService {
  private static readonly API_BASE_URL = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:8080' 
    : window.location.origin;

  /**
   * Получение активных жанров
   */
  static async getActiveGenres(): Promise<Genre[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/genres/active`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении жанров:', error);
      return [];
    }
  }

  /**
   * Получение активных тегов с мангами
   */
  static async getActiveTags(): Promise<Tag[]> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/api/tags/active/with-mangas`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Ошибка при получении тегов:', error);
      return [];
    }
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