import { useState } from 'react'
import { MessageCircle, Filter, SortAsc, SortDesc } from 'lucide-react'
import { useComments } from '@/hooks/useComments'
import { useAuth } from '@/contexts/AuthContext'
import { CommentItem } from './CommentItem'
import { CommentForm } from './CommentForm'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

interface CommentSectionProps {
  targetId: number
  type: 'MANGA' | 'CHAPTER' | 'PROFILE' | 'REVIEW'
  title?: string
  maxLevel?: number
}

export function CommentSection({ 
  targetId, 
  type, 
  title = 'Комментарии',
  maxLevel = 3 
}: CommentSectionProps) {
  const { isAuthenticated } = useAuth()
  const [sortBy, setSortBy] = useState<'createdAt' | 'likesCount'>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const {
    comments,
    isLoading,
    createComment,
    updateComment,
    deleteComment,
    addReaction,
    isCreating
  } = useComments(targetId, type)

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

  const toggleSortDir = () => {
    setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
  }

  return (
    <div className="space-y-6">
      {/* Заголовок секции */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MessageCircle className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <span className="text-sm text-gray-400">
            ({comments.length})
          </span>
        </div>

        {/* Сортировка */}
        <div className="flex items-center space-x-2">
          <Select value={sortBy} onValueChange={(value: 'createdAt' | 'likesCount') => setSortBy(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt">По дате</SelectItem>
              <SelectItem value="likesCount">По рейтингу</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSortDir}
            className="h-8 w-8 p-0"
          >
            {sortDir === 'desc' ? (
              <SortDesc className="h-4 w-4" />
            ) : (
              <SortAsc className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Форма создания комментария */}
      {isAuthenticated ? (
        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
          <CommentForm
            onSubmit={handleCreateComment}
            placeholder="Поделитесь своими мыслями..."
            submitText={isCreating ? 'Отправка...' : 'Опубликовать'}
          />
        </div>
      ) : (
        <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50 text-center">
          <p className="text-gray-400 mb-2">
            Войдите в аккаунт, чтобы оставлять комментарии
          </p>
          <Button variant="outline" size="sm">
            Войти
          </Button>
        </div>
      )}

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
        <div className="space-y-4">
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
