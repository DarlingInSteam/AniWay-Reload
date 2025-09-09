import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { CommentResponseDTO } from '@/types/comments';

// Расширенный тип комментария с информацией о родительском комментарии
export interface EnhancedCommentResponseDTO extends CommentResponseDTO {
  parentCommentAuthor?: string;
  parentCommentContent?: string;
}

export function useUserComments(userId: number, limit = 5) {
  const [comments, setComments] = useState<EnhancedCommentResponseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    const fetchComments = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Получаем комментарии пользователя через API клиент
        const data = await apiClient.getUserComments(userId);
        
        if (!cancelled) {
          // Ограничиваем количество комментариев
          const limitedComments = data.slice(0, limit);
          
          // Обогащаем комментарии информацией о родительских комментариях
          const enrichedComments = await Promise.all(
            limitedComments.map(async (comment): Promise<EnhancedCommentResponseDTO> => {
              let parentCommentAuthor: string | undefined;
              let parentCommentContent: string | undefined;
              
              // Если у комментария есть родительский комментарий, получаем информацию о нем
              if (comment.parentCommentId) {
                try {
                  const parentComment = await apiClient.getCommentById(comment.parentCommentId);
                  parentCommentAuthor = parentComment.username;
                  parentCommentContent = parentComment.content.length > 50 
                    ? parentComment.content.substring(0, 50) + '...'
                    : parentComment.content;
                } catch (error) {
                  console.warn(`Failed to fetch parent comment ${comment.parentCommentId}:`, error);
                  // В случае ошибки используем поле parentCommentAuthor из исходного комментария, если оно есть
                  parentCommentAuthor = comment.parentCommentAuthor;
                }
              }
              
              return {
                ...comment,
                parentCommentAuthor,
                parentCommentContent
              };
            })
          );
          
          setComments(enrichedComments);
        }
      } catch (e) {
        if (!cancelled) {
          console.error('Ошибка загрузки комментариев пользователя:', e);
          setError('Ошибка загрузки комментариев');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchComments();

    return () => { 
      cancelled = true; 
    };
  }, [userId, limit]);

  return { comments, loading, error, refetch: () => setComments([]) };
}
