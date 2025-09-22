import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import type { PaginatedResponse, ForumThread } from '@/types/forum'
import { forumService } from '@/services/forumService'
import type { CreateThreadRequest, UpdateThreadRequest, CreatePostRequest, UpdatePostRequest } from '@/types/forum'

// Categories
export function useForumCategories() {
  return useQuery({
    queryKey: ['forum','categories'],
    queryFn: () => forumService.getCategories(),
    staleTime: 1000 * 60 * 5
  })
}

export function useForumCategory(id?: number) {
  return useQuery({
    queryKey: ['forum','category', id],
    queryFn: () => forumService.getCategory(id!),
    enabled: !!id
  })
}

// Threads
export function useForumThreads(params: { categoryId?: number; page?: number; size?: number }) {
  return useQuery({
    queryKey: ['forum','threads', params],
    queryFn: () => forumService.getThreads(params)
  })
}

// Infinite threads (category scoped). Backend pagination: page,size. We aggregate pages client-side.
export function useInfiniteForumThreads(params: { categoryId?: number; size?: number }) {
  const size = params.size ?? 30
  return useInfiniteQuery({
    queryKey: ['forum','threads','infinite', params],
    initialPageParam: 0,
    getNextPageParam: (lastPage: PaginatedResponse<ForumThread>) => {
      if (!lastPage) return undefined
      const next = lastPage.number + 1
      return lastPage.last ? undefined : next
    },
    queryFn: ({ pageParam }) => forumService.getThreads({ categoryId: params.categoryId, page: pageParam, size }) as Promise<PaginatedResponse<ForumThread>>
  })
}

export function useForumThread(id?: number) {
  return useQuery({
    queryKey: ['forum','thread', id],
    queryFn: () => forumService.getThreadById(id!),
    enabled: !!id
  })
}

export function useCreateThread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateThreadRequest) => forumService.createThread(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum','threads'] })
      qc.invalidateQueries({ queryKey: ['forum','categories'] })
    }
  })
}

export function useUpdateThread(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateThreadRequest) => forumService.updateThread(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum','thread', id] })
      qc.invalidateQueries({ queryKey: ['forum','threads'] })
    }
  })
}

export function useDeleteThread() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => forumService.deleteThread(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum','threads'] })
    }
  })
}

// Posts
export function useThreadPosts(threadId?: number, page=0, size=20) {
  return useQuery({
    queryKey: ['forum','posts', threadId, page, size],
    queryFn: async () => {
      try {
        return await forumService.getPostsByThread(threadId!, page, size)
      } catch (e: any) {
        if (String(e?.message).includes('404')) {
          return { content: [], page: 0, size, totalElements: 0, totalPages: 0, last: true }
        }
        throw e
      }
    },
    enabled: !!threadId
  })
}

export function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePostRequest) => forumService.createPost(data),
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: ['forum','posts', post.threadId] })
      qc.invalidateQueries({ queryKey: ['forum','postTree', post.threadId] })
      qc.invalidateQueries({ queryKey: ['forum','thread', post.threadId] })
    }
  })
}

export function useUpdatePost(id: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdatePostRequest) => forumService.updatePost(id, data),
    onSuccess: (post) => {
      qc.invalidateQueries({ queryKey: ['forum','posts', post.threadId] })
      qc.invalidateQueries({ queryKey: ['forum','postTree', post.threadId] })
      qc.invalidateQueries({ queryKey: ['forum','thread', post.threadId] })
    }
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => forumService.deletePost(id),
    onSuccess: (_,_vars,ctx) => {
      // Broad invalidation fallback (thread-specific handled by caller sometimes)
      qc.invalidateQueries({ queryKey: ['forum','postTree'] })
      qc.invalidateQueries({ queryKey: ['forum','thread'] })
    }
  })
}

// Categories (admin)
export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; description?: string; icon?: string; color?: string; displayOrder?: number }) => forumService.createCategory(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forum','categories'] })
    }
  })
}

// Post Tree
export function usePostTree(threadId?: number, opts: { maxDepth?: number; maxTotal?: number; pageSize?: number } = {}) {
  return useQuery({
    queryKey: ['forum','postTree', threadId, opts],
    queryFn: () => forumService.getPostTree(threadId!, opts),
    enabled: !!threadId
  })
}

// Reactions (thread)
export function useThreadReaction(threadId: number, currentReaction?: 'LIKE'|'DISLIKE'|null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (next: 'LIKE'|'DISLIKE'|null) => {
      if (next === null && currentReaction) {
        await forumService.removeThreadReaction(threadId)
        return next
      }
      if (next) await forumService.reactToThread(threadId, next)
      return next
    },
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: ['forum','thread', threadId] })
      const prev = qc.getQueryData<any>(['forum','thread', threadId])
      if (prev) {
        const likeDelta = (()=>{
          if (prev.userReaction === 'LIKE' && next === null) return -1
          if (prev.userReaction === 'LIKE' && next === 'DISLIKE') return -1
          if (prev.userReaction !== 'LIKE' && next === 'LIKE') return 1
          return 0
        })()
        qc.setQueryData(['forum','thread', threadId], { ...prev, userReaction: next, likesCount: prev.likesCount + likeDelta })
      }
      return { prev }
    },
    onError: (_e,_v,ctx) => { if (ctx?.prev) qc.setQueryData(['forum','thread', threadId], ctx.prev) },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['forum','thread', threadId] })
      qc.invalidateQueries({ queryKey: ['forum','threads'] })
    }
  })
}

// Reactions (post)
export function usePostReaction(postId: number, threadId: number, currentReaction?: 'LIKE'|'DISLIKE'|null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (next: 'LIKE'|'DISLIKE'|null) => {
      if (next === null && currentReaction) {
        await forumService.removePostReaction(postId)
        return next
      }
      if (next) await forumService.reactToPost(postId, next)
      return next
    },
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: ['forum','postTree', threadId] })
      const prevTree = qc.getQueryData<any>(['forum','postTree', threadId])
      if (prevTree) {
        const update = (nodes: any[]): any[] => nodes.map(n => {
          if (n.id === postId) {
            const likeDelta = (()=>{
              if (n.userReaction === 'LIKE' && next === null) return -1
              if (n.userReaction === 'LIKE' && next === 'DISLIKE') return -1
              if (n.userReaction !== 'LIKE' && next === 'LIKE') return 1
              return 0
            })()
            return { ...n, userReaction: next, likesCount: n.likesCount + likeDelta }
          }
          return n.replies ? { ...n, replies: update(n.replies) } : n
        })
        qc.setQueryData(['forum','postTree', threadId], update(prevTree))
      }
      return { prevTree }
    },
    onError: (_e,_v,ctx) => { if (ctx?.prevTree) qc.setQueryData(['forum','postTree', threadId], ctx.prevTree) },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['forum','postTree', threadId] })
    }
  })
}
