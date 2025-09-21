import { apiClient } from '@/lib/api'
import {
  ForumCategory,
  ForumThread,
  ForumPost,
  CreateThreadRequest,
  UpdateThreadRequest,
  CreatePostRequest,
  UpdatePostRequest,
  PaginatedResponse
} from '@/types/forum'

class ForumService {
  // Categories
  async getCategories(): Promise<ForumCategory[]> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
    // Если есть токен – всегда используем приватный request с Authorization
    if (token) {
      try {
        return (apiClient as any).request('/forum/categories')
      } catch (e: any) {
        // В маловероятном случае 401 попробуем публично (например если endpoint реально открытый)
        if (String(e?.message).includes('401')) {
          return (apiClient as any).publicRequest('/forum/categories')
        }
        throw e
      }
    }
    // Нет токена – пробуем публично
    return (apiClient as any).publicRequest('/forum/categories')
  }

  async getCategory(id: number): Promise<ForumCategory> {
    return (apiClient as any).request(`/forum/categories/${id}`)
  }

  // Threads
  async getThreads(params: { categoryId?: number; page?: number; size?: number } = {}): Promise<PaginatedResponse<ForumThread>> {
    const search = new URLSearchParams()
    if (params.categoryId) search.append('categoryId', params.categoryId.toString())
    if (params.page != null) search.append('page', params.page.toString())
    if (params.size != null) search.append('size', params.size.toString())
    return (apiClient as any).request(`/forum/threads?${search.toString()}`)
  }

  async getThreadById(id: number): Promise<ForumThread> {
    return (apiClient as any).request(`/forum/threads/${id}`)
  }

  async createThread(body: CreateThreadRequest): Promise<ForumThread> {
    return (apiClient as any).request(`/forum/threads`, { method: 'POST', body: JSON.stringify(body) })
  }

  async updateThread(id: number, body: UpdateThreadRequest): Promise<ForumThread> {
    return (apiClient as any).request(`/forum/threads/${id}`, { method: 'PUT', body: JSON.stringify(body) })
  }

  async deleteThread(id: number): Promise<void> {
    await (apiClient as any).request(`/forum/threads/${id}`, { method: 'DELETE' })
  }

  async searchThreads(q: string, page = 0, size = 20): Promise<PaginatedResponse<ForumThread>> {
    const sp = new URLSearchParams({ q, page: page.toString(), size: size.toString() })
    return (apiClient as any).request(`/forum/threads/search?${sp.toString()}`)
  }

  // Posts (placeholder until controller implemented)
  async getPostsByThread(threadId: number, page = 0, size = 20): Promise<PaginatedResponse<ForumPost>> {
    const sp = new URLSearchParams({ page: page.toString(), size: size.toString() })
    return (apiClient as any).request(`/forum/threads/${threadId}/posts?${sp.toString()}`)
  }

  async createPost(body: CreatePostRequest): Promise<ForumPost> {
    return (apiClient as any).request(`/forum/threads/${body.threadId}/posts`, { method: 'POST', body: JSON.stringify(body) })
  }

  async updatePost(id: number, body: UpdatePostRequest): Promise<ForumPost> {
    return (apiClient as any).request(`/forum/posts/${id}`, { method: 'PUT', body: JSON.stringify(body) })
  }

  async deletePost(id: number): Promise<void> {
    await (apiClient as any).request(`/forum/posts/${id}`, { method: 'DELETE' })
  }
}

export const forumService = new ForumService()
