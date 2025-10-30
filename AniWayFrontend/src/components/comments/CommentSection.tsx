import { useState, useEffect } from 'react'
import { MessageCircle } from 'lucide-react'
import { useComments } from '@/hooks/useComments'
import { useAuth } from '@/contexts/AuthContext'
import { commentService } from '@/services/commentService'
import { CommentItem } from './CommentItem'
import { CommentForm } from './CommentForm'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { cn } from '@/lib/utils'

interface CommentSectionProps {
  targetId: number
  type: 'MANGA' | 'CHAPTER' | 'PROFILE' | 'REVIEW' | 'POST' | 'MOMENT'
  title?: string
  maxLevel?: number
  onCountChange?: (count: number) => void
  hideHeader?: boolean
}

export function CommentSection({
  targetId,
  type,
  title = 'Комментарии',
  maxLevel = 3,
  onCountChange,
  hideHeader = false
}: CommentSectionProps) {
  const { isAuthenticated } = useAuth()
  const [sortPreset, setSortPreset] = useState<'new' | 'top'>('new')
  const [totalCommentsCount, setTotalCommentsCount] = useState<number>(0)

  const sortConfig = sortPreset === 'new'
    ? { sortBy: 'createdAt' as const, sortDir: 'desc' as const }
    : { sortBy: 'likesCount' as const, sortDir: 'desc' as const }

  const {
    comments,
    isLoading,
    createComment,
    updateComment,
    deleteComment,
    addReaction,
    isCreating
  } = useComments(targetId, type, sortConfig.sortBy, sortConfig.sortDir)

  // Загружаем общее количество комментариев
  useEffect(() => {
    const loadCommentsCount = async () => {
      try {
        const count = await commentService.getCommentsCount(targetId, type)
        setTotalCommentsCount(count)
        onCountChange?.(count)
      } catch (error) {
        console.error('Failed to load comments count:', error)
      }
    }

    loadCommentsCount()
  }, [targetId, type, onCountChange])

  // Обновляем счётчик при изменении комментариев
  useEffect(() => {
    const loadCommentsCount = async () => {
      try {
        const count = await commentService.getCommentsCount(targetId, type)
        setTotalCommentsCount(count)
        onCountChange?.(count)
      } catch (error) {
        console.error('Failed to load comments count:', error)
      }
    }

    if (comments.length > 0) {
      loadCommentsCount()
    }
  }, [comments, targetId, type, onCountChange])

  const handleCreateComment = (content: string) => {
    createComment({
      content,
      targetId,
      commentType: type
    })
  }

  const handleReply = (parentCommentId: number, content: string) => {
    createComment({
      content,
      targetId,
      commentType: type,
      parentCommentId
    })
  }

  const handleEdit = (commentId: number, content: string) => {
    updateComment(commentId, { content })
  }

  const handleDelete = (commentId: number) => {
    if (window.confirm('Вы уверены, что хотите удалить этот комментарий?')) {
      deleteComment(commentId)
    }
  }

  const handleReaction = (commentId: number, reactionType: 'LIKE' | 'DISLIKE') => {
    addReaction(commentId, reactionType)
  }

  // After comments (or replies) load, attempt to scroll to hash target if present
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!comments.length) return
    if (window.location.hash.startsWith('#comment-')) {
      // Defer to allow nested replies mount
      setTimeout(() => {
        window.__rehighlightAnchor?.()
      }, 80)
    }
  }, [comments])

  const composerContent = isAuthenticated ? (
    <CommentForm
      onSubmit={handleCreateComment}
      placeholder="Оставить комментарий"
      submitText={isCreating ? 'Отправка...' : 'Отправить'}
      maxLength={600}
    />
  ) : (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
      <p className="text-white/50 mb-2">Войдите, чтобы оставить комментарий</p>
      <Button variant="outline" size="sm">Войти</Button>
    </div>
  )

  return (
    <div className="space-y-6 max-w-full">
      {/* Заголовок секции */}
      <div className="flex flex-col gap-4">
        {!hideHeader && (
          <div className="flex items-center gap-3 min-w-0">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-white truncate">{title}</h2>
            <span className="text-sm text-white/40 flex-shrink-0">{totalCommentsCount}</span>
          </div>
        )}

        {/* Форма создания комментария */}
        {composerContent}

        {!hideHeader && (
          <div className="flex items-center gap-2">
            {(
              [
                { key: 'new' as const, label: 'Новые' },
                { key: 'top' as const, label: 'Интересные' }
              ]
            ).map(option => (
              <button
                key={option.key}
                type="button"
                onClick={() => setSortPreset(option.key)}
                className={cn(
                  'rounded-full px-3 py-1 text-sm transition-colors',
                  sortPreset === option.key
                    ? 'bg-primary text-white shadow-[0_4px_20px_-10px_rgba(59,130,246,0.8)]'
                    : 'bg-white/[0.08] text-white/60 hover:text-white'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Список комментариев */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">
            Пока нет комментариев. Будьте первым!
          </p>
        </div>
      ) : (
        <div className="space-y-4 overflow-x-hidden">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              targetId={targetId}
              type={type}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReaction={handleReaction}
              maxLevel={maxLevel}
            />
          ))}
        </div>
      )}
    </div>
  )
}
