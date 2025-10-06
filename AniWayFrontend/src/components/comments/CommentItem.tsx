import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { buildProfileUrl } from '../../lib/profileUrl'
import { useResolvedAvatar } from '@/hooks/useResolvedAvatar'
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
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer'

interface CommentItemProps {
  comment: CommentResponseDTO
  targetId: number
  type: 'MANGA' | 'CHAPTER' | 'PROFILE' | 'REVIEW' | 'POST'
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
  const { user, isAuthenticated, isAdmin } = useAuth()
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showReplies, setShowReplies] = useState(level <= 1) // Сворачиваем ответы после 1 уровня по умолчанию
  const [isEditing, setIsEditing] = useState(false)

  const isOwner = user?.id === comment.userId
  const isDeleted = comment.isDeleted ?? false
  const canEdit = !isDeleted && ((comment.canEdit ?? false) || isOwner)
  const canDelete = !isDeleted && ((comment.canDelete ?? isOwner) || isAdmin)
  const canShowMenu = canEdit || canDelete
  const hasReplies = comment.replies && comment.replies.length > 0

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
        "p-4 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10",
        level > 0 && "ml-6"
      )}>
        <p className="text-gray-400 italic">Комментарий удален</p>
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

  const primaryProvided = comment.userAvatar || (comment as any).avatar || undefined
  const computedAvatar = useResolvedAvatar(comment.userId, primaryProvided)

  // Responsive indentation: full 1.5rem (ml-6) only on md+ screens; on small screens we compress after depth 1
  const indentClass = level > 0 ? (level === 1 ? 'ml-4 md:ml-6' : 'ml-3 md:ml-6') : ''
  const clampedIndent = indentClass

  return (
    <div
      id={`comment-${comment.id}`}
      className={cn(
        "p-4 rounded-3xl bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors group target-comment overflow-hidden",
        clampedIndent
      )}
      style={{
        // Hard cap visual indentation growth on mobile by limiting max width shrink
        // (Optional future: compute based on viewport width)
      }}
    >
      {/* Заголовок комментария */}
      <div className="flex items-start justify-between mb-3 min-w-0">
        <div className="flex items-center space-x-3 min-w-0">
          <Link
            to={buildProfileUrl(comment.userId, (comment as any).userDisplayName || comment.username, comment.username)}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-full"
            aria-label={`Профиль пользователя ${comment.username}`}
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={computedAvatar} />
              <AvatarFallback className="bg-primary text-white">
                {comment.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0">
            <Link
              to={buildProfileUrl(comment.userId, (comment as any).userDisplayName || comment.username, comment.username)}
              className="font-medium text-white group-hover:text-primary transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded break-all"
            >
              {comment.username}
            </Link>
            <div className="flex items-center space-x-2 text-sm text-gray-400 group-hover:text-primary/80 transition-colors">
              <span>{formatDate(comment.createdAt)}</span>
              {comment.isEdited && (
                <span className="text-xs bg-gray-700 px-2 py-0.5 rounded group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                  отредактировано
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Меню действий */}
        {canShowMenu && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Редактировать
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(comment.id)}
                  className="text-red-400"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить
                </DropdownMenuItem>
              )}
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
        <div className="mb-3 text-white leading-relaxed markdown-body break-words">
          <MarkdownRenderer value={comment.content} />
        </div>
      )}

      {/* Действия с комментарием */}
  <div className="flex items-center space-x-4 flex-wrap">
        {/* Лайки и дизлайки */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={!isAuthenticated}
            className={cn(
              "h-8 px-2 flex items-center gap-1",
              comment.userReaction === 'LIKE' ? 'text-green-400 bg-green-500/10 hover:text-green-300' : 'text-gray-400 hover:text-green-400',
              !isAuthenticated && 'cursor-not-allowed'
            )}
            aria-pressed={comment.userReaction === 'LIKE'}
            aria-label="Поставить лайк"
          >
            <Heart className={cn("h-4 w-4", comment.userReaction === 'LIKE' && 'fill-green-400')} />
            <span>{comment.likesCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDislike}
            disabled={!isAuthenticated}
            className={cn(
              "h-8 px-2 flex items-center gap-1",
              comment.userReaction === 'DISLIKE' ? 'text-red-400 bg-red-500/10 hover:text-red-300' : 'text-gray-400 hover:text-red-400',
              !isAuthenticated && 'cursor-not-allowed'
            )}
            aria-pressed={comment.userReaction === 'DISLIKE'}
            aria-label="Поставить дизлайк"
          >
            <HeartOff className={cn("h-4 w-4", comment.userReaction === 'DISLIKE' && 'fill-red-400')} />
            <span>{comment.dislikesCount}</span>
          </Button>
        </div>

        {/* Ответить */}
        {isAuthenticated && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="h-8 px-2 text-gray-400 hover:text-primary transition-colors"
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
            className="h-8 px-2 text-gray-400 hover:text-primary transition-colors"
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
