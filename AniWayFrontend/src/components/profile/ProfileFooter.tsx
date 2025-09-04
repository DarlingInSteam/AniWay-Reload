import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageCircle, Share, Download, Send, Heart, MoreVertical } from 'lucide-react';

interface ProfileComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: Date;
  likes: number;
  isLiked: boolean;
}

interface ProfileFooterProps {
  comments: ProfileComment[];
  isOwnProfile: boolean;
  canComment: boolean;
  onAddComment?: (content: string) => void;
  onLikeComment?: (commentId: string) => void;
  onShare?: () => void;
  onExportData?: () => void;
}

export function ProfileFooter({
  comments,
  isOwnProfile,
  canComment,
  onAddComment,
  onLikeComment,
  onShare,
  onExportData
}: ProfileFooterProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddComment?.(newComment.trim());
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCommentTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}д назад`;
    if (hours > 0) return `${hours}ч назад`;
    if (minutes > 0) return `${minutes}мин назад`;
    return 'только что';
  };

  return (
    <div className="space-y-6">
      {/* Действия с профилем */}
      <Card className="bg-white/3 backdrop-blur-md border border-white/8 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={onShare}
              variant="outline"
              className="border-white/15 bg-white/3 text-gray-300 hover:bg-white/8"
            >
              <Share className="w-4 h-4 mr-2" />
              Поделиться профилем
            </Button>

            {isOwnProfile && (
              <Button
                onClick={onExportData}
                variant="outline"
                className="border-white/15 bg-white/3 text-gray-300 hover:bg-white/8"
              >
                <Download className="w-4 h-4 mr-2" />
                Экспорт данных
              </Button>
            )}

            <Button
              variant="outline"
              className="border-white/15 bg-white/3 text-gray-300 hover:bg-white/8"
            >
              <MoreVertical className="w-4 h-4 mr-2" />
              Ещё
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Комментарии */}
      <Card className="bg-white/3 backdrop-blur-md border border-white/8 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-400" />
            <span>Комментарии</span>
            {comments.length > 0 && (
              <span className="text-sm font-normal text-gray-400">
                ({comments.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Форма добавления комментария */}
          {canComment && !isOwnProfile && (
            <div className="space-y-3">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Оставьте комментарий..."
                className="bg-white/8 border-white/15 resize-none text-white placeholder:text-gray-400 focus:border-white/25"
                rows={3}
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  {newComment.length}/500 символов
                </span>
                <Button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  size="sm"
                  className="bg-blue-500/15 hover:bg-blue-500/25 border-blue-400/25"
                >
                  <Send className="w-4 h-4 mr-1" />
                  {isSubmitting ? 'Отправка...' : 'Отправить'}
                </Button>
              </div>
            </div>
          )}

          {/* Список комментариев */}
          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 p-4 bg-white/3 rounded-lg backdrop-blur-sm">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={comment.authorAvatar} alt={comment.authorName} />
                    <AvatarFallback className="text-xs bg-white/15 text-white">
                      {comment.authorName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">
                        {comment.authorName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatCommentTime(comment.createdAt)}
                      </span>
                    </div>

                    <p className="text-sm text-gray-200 whitespace-pre-wrap mb-2">
                      {comment.content}
                    </p>

                    <div className="flex items-center gap-4">
                      <Button
                        onClick={() => onLikeComment?.(comment.id)}
                        variant="ghost"
                        size="sm"
                        className={`p-1 h-auto hover:bg-white/8 ${
                          comment.isLiked ? 'text-red-400' : 'text-gray-400'
                        }`}
                      >
                        <Heart className={`w-4 h-4 mr-1 ${comment.isLiked ? 'fill-current' : ''}`} />
                        <span className="text-xs">{comment.likes}</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-auto text-gray-400 hover:bg-white/8 hover:text-white"
                      >
                        <span className="text-xs">Ответить</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">
                {isOwnProfile ?
                  'Пока никто не оставил комментариев в вашем профиле' :
                  'Будьте первым, кто оставит комментарий!'
                }
              </p>
              <p className="text-sm">Система комментариев находится в разработке</p>
            </div>
          )}

          {/* Кнопка загрузки большего количества комментариев */}
          {comments.length > 0 && comments.length >= 10 && (
            <Button
              variant="outline"
              className="w-full border-white/15 bg-white/3 text-gray-300 hover:bg-white/8"
            >
              Загрузить ещё комментарии
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
