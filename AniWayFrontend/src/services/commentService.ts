import { 
  CommentCreateDTO, 
  CommentUpdateDTO, 
  CommentResponseDTO 
} from '@/types/comments'

class CommentService {
  private readonly API_BASE = '/api/comments'

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('authToken')
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    // Используем относительный URL, который будет относиться к текущему хосту
    const url = `${this.API_BASE}${endpoint}`;
    console.log('Requesting comments from URL:', url);
    
    const response = await fetch(url, {
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
    type: 'MANGA' | 'CHAPTER' | 'PROFILE' | 'REVIEW' | 'POST',
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
   * Получение количества комментариев для цели
   */
  async getCommentsCount(
    targetId: number,
    type: 'MANGA' | 'CHAPTER' | 'PROFILE' | 'REVIEW' | 'POST'
  ): Promise<number> {
    const params = new URLSearchParams({
      targetId: targetId.toString(),
      type
    })

    const result = await this.request<{ count: number }>(`/count?${params}`)
    return result.count || 0
  }

  /**
   * Получение всех комментариев пользователя
   */
  async getUserComments(userId: number): Promise<CommentResponseDTO[]> {
    return this.request(`/user/${userId}`)
  }

  // (Reactions API omitted in minimal integration)
  // Backwards compatibility stubs for legacy reaction UI. They return updated counts shape-like objects
  // or the raw comment if backend adds reactions later. For now they no-op to avoid build/runtime errors.
  async addReaction(commentId: number, reactionType: 'LIKE' | 'DISLIKE'): Promise<{ commentId: number; reactionType: string }> {
    console.warn('[commentService] addReaction stub invoked (no backend wiring). commentId=', commentId, 'reactionType=', reactionType)
    return { commentId, reactionType }
  }
  async removeReaction(commentId: number): Promise<{ commentId: number }> {
    console.warn('[commentService] removeReaction stub invoked (no backend wiring). commentId=', commentId)
    return { commentId }
  }

  // Convenience wrappers for posts
  async listForPost(postId: number, page=0, size=20) {
    return this.getComments(postId, 'POST', page, size, 'createdAt', 'desc');
  }
  async createForPost(postId: number, content: string, parentCommentId?: number) {
    return this.createComment({ content, targetId: postId, commentType: 'POST', parentCommentId });
  }
}

export const commentService = new CommentService()
