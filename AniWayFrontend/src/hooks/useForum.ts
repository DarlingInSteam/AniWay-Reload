import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
    }
  })
}

export function useDeletePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => forumService.deletePost(id),
    onSuccess: () => {
      // caller provides own invalidation if needed
    }
  })
}
