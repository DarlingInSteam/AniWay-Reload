import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';
import { reviewsService } from '@/services/reviewsService';
import { CommentResponseDTO } from '@/types/comments';

// Расширенный тип комментария с информацией о цели и родительском комментарии
export interface EnhancedCommentResponseDTO extends CommentResponseDTO {
  parentCommentAuthor?: string;
  parentCommentContent?: string;
  targetInfo?: {
    title: string;
    subtitle?: string;
  };
}

export function useEnhancedUserComments(userId: number, limit = 5) {
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
          
          // Обогащаем комментарии информацией
          const enrichedComments = await Promise.all(
            limitedComments.map(async (comment): Promise<EnhancedCommentResponseDTO> => {
              let parentCommentAuthor: string | undefined;
              let parentCommentContent: string | undefined;
              let targetInfo: { title: string; subtitle?: string } | undefined;
              
              // Получаем информацию о родительском комментарии
              if (comment.parentCommentId) {
                try {
                  const parentComment = await apiClient.getCommentById(comment.parentCommentId);
                  parentCommentAuthor = parentComment.username;
                  parentCommentContent = parentComment.content.length > 50 
                    ? parentComment.content.substring(0, 50) + '...'
                    : parentComment.content;
                } catch (error) {
                  console.warn(`Failed to fetch parent comment ${comment.parentCommentId}:`, error);
                  parentCommentAuthor = comment.parentCommentAuthor;
                }
              }
              
              // Получаем информацию о цели комментария
              const commentType = comment.commentType || comment.type;
              if (commentType && comment.targetId) {
                try {
                  switch (commentType) {
                    case 'MANGA':
                      try {
                        const manga = await apiClient.getMangaById(comment.targetId);
                        targetInfo = {
                          title: manga.title || `Манга #${comment.targetId}`
                        };
                      } catch (error) {
                        console.warn(`Failed to fetch manga ${comment.targetId}:`, error);
                        targetInfo = {
                          title: `Манга #${comment.targetId}`
                        };
                      }
                      break;
                      
                    case 'CHAPTER':
                      try {
                        const chapter = await apiClient.getChapterById(comment.targetId);
                        try {
                          const chapterManga = await apiClient.getMangaById(chapter.mangaId);
                          targetInfo = {
                            title: chapterManga.title || `Манга #${chapter.mangaId}`,
                            subtitle: `Глава ${chapter.originalChapterNumber || chapter.chapterNumber}`
                          };
                        } catch (mangaError) {
                          console.warn(`Failed to fetch manga for chapter ${comment.targetId}:`, mangaError);
                          targetInfo = {
                            title: `Манга #${chapter.mangaId}`,
                            subtitle: `Глава ${chapter.originalChapterNumber || chapter.chapterNumber}`
                          };
                        }
                      } catch (error) {
                        console.warn(`Failed to fetch chapter ${comment.targetId}:`, error);
                        targetInfo = {
                          title: `Глава #${comment.targetId}`
                        };
                      }
                      break;
                      
                    case 'PROFILE':
                      try {
                        const userProfile = await apiClient.getUserPublicProfile(comment.targetId);
                        targetInfo = {
                          title: `@${userProfile.username}`
                        };
                      } catch (error) {
                        console.warn(`Failed to fetch user profile ${comment.targetId}:`, error);
                        targetInfo = {
                          title: `Профиль #${comment.targetId}`
                        };
                      }
                      break;
                      
                    case 'REVIEW':
                      try {
                        const review = await reviewsService.getReviewById(comment.targetId);
                        if (review && review.mangaTitle !== `Отзыв #${comment.targetId}`) {
                          targetInfo = {
                            title: `Отзыв к манге "${review.mangaTitle}"`
                          };
                        } else {
                          targetInfo = {
                            title: `Отзыв #${comment.targetId}`
                          };
                        }
                      } catch (error) {
                        console.warn(`Failed to fetch review ${comment.targetId}:`, error);
                        targetInfo = {
                          title: `Отзыв #${comment.targetId}`
                        };
                      }
                      break;

                    case 'MOMENT':
                      try {
                        const moment = await apiClient.getMomentById(comment.targetId);
                        targetInfo = {
                          title: moment.caption || `Момент #${comment.targetId}`,
                          subtitle: moment.mangaId ? `Манга #${moment.mangaId}` : undefined
                        };
                      } catch (error) {
                        console.warn(`Failed to fetch moment ${comment.targetId}:`, error);
                        targetInfo = {
                          title: `Момент #${comment.targetId}`
                        };
                      }
                      break;
                      
                    default:
                      targetInfo = {
                        title: `${commentType} #${comment.targetId}`
                      };
                  }
                } catch (error) {
                  console.warn(`Failed to fetch target info for ${commentType}:${comment.targetId}:`, error);
                  targetInfo = {
                    title: `${commentType} #${comment.targetId}`
                  };
                }
              }
              
              return {
                ...comment,
                parentCommentAuthor,
                parentCommentContent,
                targetInfo
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
