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

  async createCategory(body: { name: string; description?: string; icon?: string; color?: string; displayOrder?: number }): Promise<ForumCategory> {
    return (apiClient as any).request(`/forum/categories`, { method: 'POST', body: JSON.stringify(body) })
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

  async pinThread(id: number, pinned: boolean): Promise<void> {
    await (apiClient as any).request(`/forum/threads/${id}/pin?pinned=${pinned}`, { method: 'POST' })
  }

  async lockThread(id: number, locked: boolean): Promise<void> {
    await (apiClient as any).request(`/forum/threads/${id}/lock?locked=${locked}`, { method: 'POST' })
  }

  async subscribeThread(id: number): Promise<void> {
    await (apiClient as any).request(`/forum/threads/${id}/subscribe`, { method: 'POST' })
  }

  async unsubscribeThread(id: number): Promise<void> {
    await (apiClient as any).request(`/forum/threads/${id}/subscribe`, { method: 'DELETE' })
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

  // Posts Tree
  async getPostTree(threadId: number, opts: { maxDepth?: number; maxTotal?: number; pageSize?: number } = {}): Promise<ForumPost[]> {
    const p = new URLSearchParams()
    if (opts.maxDepth) p.append('maxDepth', String(opts.maxDepth))
    if (opts.maxTotal) p.append('maxTotal', String(opts.maxTotal))
    if (opts.pageSize) p.append('pageSize', String(opts.pageSize))
    const q = p.toString()
    return (apiClient as any).request(`/forum/threads/${threadId}/posts/tree${q ? '?' + q : ''}`)
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

  // Reactions
  async reactToThread(threadId: number, type: 'LIKE' | 'DISLIKE'): Promise<void> {
    await (apiClient as any).request(`/forum/threads/${threadId}/reactions?type=${type}`, { method: 'POST' })
  }
  async removeThreadReaction(threadId: number): Promise<void> {
    await (apiClient as any).request(`/forum/threads/${threadId}/reactions`, { method: 'DELETE' })
  }
  async reactToPost(postId: number, type: 'LIKE' | 'DISLIKE'): Promise<void> {
    await (apiClient as any).request(`/forum/posts/${postId}/reactions?type=${type}`, { method: 'POST' })
  }
  async removePostReaction(postId: number): Promise<void> {
    await (apiClient as any).request(`/forum/posts/${postId}/reactions`, { method: 'DELETE' })
  }
}

export const forumService = new ForumService()
