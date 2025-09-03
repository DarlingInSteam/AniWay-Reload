import { MangaResponseDTO, ChapterDTO, ChapterImageDTO, SearchParams, UserSearchParams, UserSearchResult, User } from '@/types';

const API_BASE_URL = '/api';

class ApiClient {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Manga API
  async getAllManga(): Promise<MangaResponseDTO[]> {
    return this.request<MangaResponseDTO[]>('/manga');
  }

  async getMangaById(id: number): Promise<MangaResponseDTO> {
    return this.request<MangaResponseDTO>(`/manga/${id}`);
  }

  async searchManga(params: SearchParams): Promise<MangaResponseDTO[]> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value);
    });

    return this.request<MangaResponseDTO[]>(`/manga/search?${searchParams}`);
  }

  async updateManga(id: number, data: any): Promise<MangaResponseDTO> {
    return this.request<MangaResponseDTO>(`/manga/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteManga(id: number): Promise<void> {
    await this.request<void>(`/manga/${id}`, {
      method: 'DELETE',
    });
  }

  async getMangaChapters(mangaId: number): Promise<ChapterDTO[]> {
    return this.request<ChapterDTO[]>(`/manga/${mangaId}/chapters`);
  }

  // Chapter API
  async getChapterById(id: number): Promise<ChapterDTO> {
    return this.request<ChapterDTO>(`/chapters/${id}`);
  }

  async getChaptersByManga(mangaId: number): Promise<ChapterDTO[]> {
    return this.request<ChapterDTO[]>(`/chapters/manga/${mangaId}`);
  }

  // Image API
  async getChapterImages(chapterId: number): Promise<ChapterImageDTO[]> {
    return this.request<ChapterImageDTO[]>(`/images/chapter/${chapterId}`);
  }

  async getChapterImagePreview(chapterId: number): Promise<ChapterImageDTO[]> {
    return this.request<ChapterImageDTO[]>(`/images/chapter/${chapterId}/preview`);
  }

  // User API
  async searchUsers(params: UserSearchParams): Promise<UserSearchResult> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value.toString());
    });

    return this.request<UserSearchResult>(`/auth/users/search?${searchParams}`);
  }

  async getUserProfile(userId: number): Promise<User> {
    return this.request<User>(`/auth/users/${userId}`);
  }

  async getUserPublicProfile(userId: number): Promise<User> {
    return this.request<User>(`/auth/users/${userId}/public`);
  }

  // Bookmarks API
  async getUserPublicBookmarks(username: string): Promise<any[]> {
    return this.request<any[]>(`/bookmarks/user/${username}`);
  }

  async getUserBookmarksByStatus(status: string): Promise<any[]> {
    return this.request<any[]>(`/bookmarks/status/${status}`);
  }

  async getUserFavorites(): Promise<any[]> {
    return this.request<any[]>(`/bookmarks/favorites`);
  }

  // Reading Progress API
  async getUserReadingStats(): Promise<any> {
    return this.request<any>(`/auth/progress/stats`);
  }

  async getUserProgress(): Promise<any[]> {
    return this.request<any[]>(`/auth/progress`);
  }

  // Утилитарный метод для получения URL изображения через прокси
  getImageUrl(imageKey: string): string {
    return `${API_BASE_URL}/images/proxy/${imageKey}`;
  }
}

export const apiClient = new ApiClient();
