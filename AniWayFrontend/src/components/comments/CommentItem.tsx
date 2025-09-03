import { useState } from 'react'
import { formatDistanceToNow } from '@/lib/date-utils'
import { 
  Heart, 
  HeartOff, 
  MessageCircle, 
  Edit, 
  Trash2, 
  ChevronDown, 
  ChevronUp,
  User,
  MoreHorizontal 
} from 'lucide-react'
import { CommentResponseDTO } from '@/types/comments'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { CommentForm } from './CommentForm'
import { cn } from '@/lib/utils'

interface CommentItemProps {
  comment: CommentResponseDTO
  targetId: number
  type: 'MANGA' | 'CHAPTER' | 'PROFILE' | 'REVIEW'
  onReply: (parentId: number, content: string) => void
  onEdit: (commentId: number, content: string) => void
  onDelete: (commentId: number) => void
  onReaction: (commentId: number, reactionType: 'LIKE' | 'DISLIKE') => void
  level?: number
  maxLevel?: number
}

export function CommentItem({
  comment,
  targetId,
  type,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  level = 0,
  maxLevel = 10
}: CommentItemProps) {
  const { user, isAuthenticated } = useAuth()
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showReplies, setShowReplies] = useState(true)
  const [showAllReplies, setShowAllReplies] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const isOwner = user?.id === comment.userId
  const canEdit = isOwner && !comment.isDeleted
  const hasReplies = comment.replies && comment.replies.length > 0
  
  // Определяем пороговый уровень для сворачивания
  const COLLAPSE_LEVEL = 3
  const shouldCollapseDeep = level >= COLLAPSE_LEVEL && !showAllReplies
  
  // Показываем только первые несколько ответов на глубоких уровнях
  const visibleReplies = shouldCollapseDeep && hasReplies 
    ? comment.replies?.slice(0, 2) 
    : comment.replies
  
  const hiddenRepliesCount = shouldCollapseDeep && hasReplies 
    ? Math.max(0, (comment.replies?.length || 0) - 2)
    : 0

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(dateString, { 
      addSuffix: true 
    })
  }

  const handleReplySubmit = (content: string) => {
    onReply(comment.id, content)
    setShowReplyForm(false)
  }

  const handleEditSubmit = (content: string) => {
    onEdit(comment.id, content)
    setIsEditing(false)
  }

  const handleLike = () => {
    if (!isAuthenticated) return
    onReaction(comment.id, 'LIKE')
  }

  const handleDislike = () => {
    if (!isAuthenticated) return
    onReaction(comment.id, 'DISLIKE')
  }

  if (comment.isDeleted) {
    return (
      <div className={cn(
        "p-4 rounded-lg bg-gray-800/30 border border-gray-700/50",
        level > 0 && "ml-6"
      )}>
        <p className="text-gray-500 italic">Комментарий удален</p>
        {hasReplies && (
          <div className="mt-4 space-y-3">
            {comment.replies?.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                targetId={targetId}
                type={type}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onReaction={onReaction}
                level={level + 1}
                maxLevel={maxLevel}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      "p-4 rounded-lg bg-gray-800/50 border border-gray-700/30",
      level > 0 && "ml-6"
    )}>
      {/* Заголовок комментария */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.userAvatar} />
            <AvatarFallback className="bg-primary text-white">
              {comment.username.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <span className="font-medium text-white">{comment.username}</span>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>{formatDate(comment.createdAt)}</span>
              {comment.isEdited && (
                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">
                  отредактировано
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Меню действий */}
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Редактировать
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(comment.id)}
                className="text-red-400"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Удалить
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Содержимое комментария */}
      {isEditing ? (
        <CommentForm
          initialValue={comment.content}
          onSubmit={handleEditSubmit}
          onCancel={() => setIsEditing(false)}
          placeholder="Редактировать комментарий..."
          submitText="Сохранить"
        />
      ) : (
        <div className="mb-3">
          <p className="text-gray-200 whitespace-pre-wrap leading-relaxed">
            {comment.content}
          </p>
        </div>
      )}

      {/* Действия с комментарием */}
      <div className="flex items-center space-x-4">
        {/* Лайки и дизлайки */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={!isAuthenticated}
            className={cn(
              "h-8 px-2 text-gray-400 hover:text-green-400",
              !isAuthenticated && "cursor-not-allowed"
            )}
          >
            <Heart className="h-4 w-4 mr-1" />
            <span>{comment.likesCount}</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDislike}
            disabled={!isAuthenticated}
            className={cn(
              "h-8 px-2 text-gray-400 hover:text-red-400",
              !isAuthenticated && "cursor-not-allowed"
            )}
          >
            <HeartOff className="h-4 w-4 mr-1" />
            <span>{comment.dislikesCount}</span>
          </Button>
        </div>

        {/* Ответить */}
        {isAuthenticated && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="h-8 px-2 text-gray-400 hover:text-blue-400"
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            Ответить
          </Button>
        )}

        {/* Показать ответы */}
        {hasReplies && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplies(!showReplies)}
            className="h-8 px-2 text-gray-400 hover:text-white"
          >
            {showReplies ? (
              <ChevronUp className="h-4 w-4 mr-1" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-1" />
            )}
            {comment.repliesCount || comment.replies?.length} ответ{
              (comment.repliesCount || comment.replies?.length || 0) > 1 ? 'а' : ''
            }
          </Button>
        )}
      </div>

      {/* Форма ответа */}
      {showReplyForm && (
        <div className="mt-4">
          <CommentForm
            onSubmit={handleReplySubmit}
            onCancel={() => setShowReplyForm(false)}
            placeholder="Написать ответ..."
            submitText="Ответить"
          />
        </div>
      )}

      {/* Ответы */}
      {hasReplies && showReplies && (
        <div className="mt-4 space-y-3">
          {visibleReplies?.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              targetId={targetId}
              type={type}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReaction={onReaction}
              level={level + 1}
              maxLevel={maxLevel}
            />
          ))}
          
          {/* Кнопка "Показать все ответы" для глубокой вложенности */}
          {hiddenRepliesCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllReplies(true)}
              className="h-8 px-2 text-blue-400 hover:text-blue-300"
            >
              Показать все {hiddenRepliesCount} ответ{hiddenRepliesCount > 1 ? 'а' : ''}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
