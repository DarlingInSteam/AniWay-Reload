import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { commentService } from '@/services/commentService'
import { 
  CommentCreateDTO, 
  CommentUpdateDTO, 
  CommentResponseDTO 
} from '@/types/comments'
import { toast } from 'sonner'

export function useComments(
  targetId: number,
  type: 'MANGA' | 'CHAPTER' | 'PROFILE' | 'REVIEW' | 'POST',
  sortBy: 'createdAt' | 'likesCount' = 'createdAt',
  sortDir: 'asc' | 'desc' = 'desc'
) {
  const queryClient = useQueryClient()
  const queryKey = ['comments', targetId, type, sortBy, sortDir]

  const {
    data: comments = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: () => commentService.getComments(targetId, type, 0, 20, sortBy, sortDir),
    staleTime: 30000, // 30 секунд
  })

  const createMutation = useMutation({
    mutationFn: (data: CommentCreateDTO) => commentService.createComment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      // Emit custom event so parent components (e.g., PostCommentsModal -> PostItem) can adjust counts without refetch
      document.dispatchEvent(new CustomEvent('comment-count-delta', { detail: { targetId, type, delta: 1 } }))
      toast.success('Комментарий добавлен')
    },
    onError: (error) => {
      toast.error('Ошибка при добавлении комментария')
      console.error('Create comment error:', error)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ commentId, data }: { commentId: number; data: CommentUpdateDTO }) =>
      commentService.updateComment(commentId, data),
    onSuccess: () => {
  queryClient.invalidateQueries({ queryKey })
      toast.success('Комментарий обновлен')
    },
    onError: (error) => {
      toast.error('Ошибка при обновлении комментария')
      console.error('Update comment error:', error)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: (commentId: number) => commentService.deleteComment(commentId),
    onSuccess: () => {
  queryClient.invalidateQueries({ queryKey })
      document.dispatchEvent(new CustomEvent('comment-count-delta', { detail: { targetId, type, delta: -1 } }))
      toast.success('Комментарий удален')
    },
    onError: (error) => {
      toast.error('Ошибка при удалении комментария')
      console.error('Delete comment error:', error)
    }
  })

  const reactionMutation = useMutation({
    mutationFn: ({ commentId, reactionType }: { commentId: number; reactionType: 'LIKE' | 'DISLIKE' }) =>
      commentService.addReaction(commentId, reactionType),
    onSuccess: (stats) => {
      // Optimistically update counts in cache
      queryClient.setQueryData<CommentResponseDTO[]>(queryKey, (old)=>{
        if(!old) return old;
        return old.map(c=> c.id === stats.commentId ? { ...c, likesCount: stats.likesCount, dislikesCount: stats.dislikesCount } : c);
      });
      // Also update replies if any (deep walk)
      // For simplicity, just invalidate afterwards to refresh full tree
      queryClient.invalidateQueries({ queryKey })
    },
    onError: (error) => {
      toast.error('Ошибка при добавлении реакции')
      console.error('Reaction error:', error)
    }
  })

  const createComment = useCallback((data: CommentCreateDTO) => {
    createMutation.mutate(data)
  }, [createMutation])

  const updateComment = useCallback((commentId: number, data: CommentUpdateDTO) => {
    updateMutation.mutate({ commentId, data })
  }, [updateMutation])

  const deleteComment = useCallback((commentId: number) => {
    deleteMutation.mutate(commentId)
  }, [deleteMutation])

  const addReaction = useCallback((commentId: number, reactionType: 'LIKE' | 'DISLIKE') => {
    reactionMutation.mutate({ commentId, reactionType })
  }, [reactionMutation])

  return {
    comments,
    isLoading,
    error,
    refetch,
    createComment,
    updateComment,
    deleteComment,
    addReaction,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  }
}

export function useReplies(parentCommentId: number) {
  const queryClient = useQueryClient()
  const queryKey = ['replies', parentCommentId]

  const {
    data: replies = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: () => commentService.getReplies(parentCommentId),
    enabled: !!parentCommentId,
    staleTime: 30000,
  })

  return {
    replies,
    isLoading,
    error,
    refetch
  }
}
