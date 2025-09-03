import { 
  CommentCreateDTO, 
  CommentUpdateDTO, 
  CommentResponseDTO, 
  CommentReactionDTO 
} from '@/types/comments'

class CommentService {
  private readonly API_BASE = 'http://localhost:8080/api/comments'

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth-token')
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.API_BASE}${endpoint}`, {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...options?.headers
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    if (response.status === 204) {
      return {} as T
    }

    // Проверяем, есть ли содержимое для парсинга
    const contentLength = response.headers.get('content-length')
    const contentType = response.headers.get('content-type')
    
    if (contentLength === '0' || (!contentType?.includes('application/json'))) {
      return {} as T
    }

    const text = await response.text()
    return text ? JSON.parse(text) : {} as T
  }

  /**
   * Создание нового комментария
   */
  async createComment(data: CommentCreateDTO): Promise<CommentResponseDTO> {
    return this.request('', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  /**
   * Обновление комментария
   */
  async updateComment(commentId: number, data: CommentUpdateDTO): Promise<CommentResponseDTO> {
    return this.request(`/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    })
  }

  /**
   * Удаление комментария
   */
  async deleteComment(commentId: number): Promise<void> {
    return this.request(`/${commentId}`, {
      method: 'DELETE'
    })
  }

  /**
   * Получение комментариев для объекта
   */
  async getComments(
    targetId: number,
    type: 'MANGA' | 'CHAPTER' | 'PROFILE' | 'REVIEW',
    page: number = 0,
    size: number = 20,
    sortBy: string = 'createdAt',
    sortDir: 'asc' | 'desc' = 'desc'
  ): Promise<CommentResponseDTO[]> {
    const params = new URLSearchParams({
      targetId: targetId.toString(),
      type,
      page: page.toString(),
      size: size.toString(),
      sortBy,
      sortDir
    })

    return this.request(`?${params}`)
  }

  /**
   * Получение ответов на комментарий
   */
  async getReplies(
    parentCommentId: number,
    page: number = 0,
    size: number = 10,
    sortBy: string = 'createdAt',
    sortDir: 'asc' | 'desc' = 'asc'
  ): Promise<CommentResponseDTO[]> {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sortBy,
      sortDir
    })

    return this.request(`/${parentCommentId}/replies?${params}`)
  }

  /**
   * Добавление реакции на комментарий
   */
  async addReaction(commentId: number, reactionType: 'LIKE' | 'DISLIKE'): Promise<void> {
    const params = new URLSearchParams({
      reactionType
    })

    return this.request(`/${commentId}/reactions?${params}`, {
      method: 'POST'
    })
  }

  /**
   * Получение количества комментариев для цели
   */
  async getCommentsCount(
    targetId: number,
    type: 'MANGA' | 'CHAPTER' | 'PROFILE' | 'REVIEW'
  ): Promise<number> {
    const params = new URLSearchParams({
      targetId: targetId.toString(),
      type
    })

    const result = await this.request<{ count: number }>(`/count?${params}`)
    return result.count || 0
  }

  /**
   * Получение статистики реакций
   */
  async getReactionStats(commentId: number): Promise<CommentReactionDTO> {
    return this.request(`/${commentId}/reactions`)
  }
}

export const commentService = new CommentService()
