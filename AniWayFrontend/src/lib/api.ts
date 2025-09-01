import { MangaResponseDTO, ChapterDTO, ChapterImageDTO, SearchParams } from '@/types';

const API_BASE_URL = '/api';

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
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

  // Утилитарный метод для получения URL изображения через прокси
  getImageUrl(imageKey: string): string {
    return `${API_BASE_URL}/images/proxy/${imageKey}`;
  }
}

export const apiClient = new ApiClient();
